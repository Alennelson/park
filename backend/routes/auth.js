const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const User = require("../models/user");

/* MULTER CONFIGURATION FOR ID PROOF UPLOAD */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, "id-" + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'application/pdf';
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files (jpeg, jpg, png) and PDF are allowed"));
    }
  }
});

/* REGISTER WITH ID PROOF */
router.post("/register", upload.single("idProof"), async (req, res) => {
  try {
    const { name, email, password, phone, idProofType } = req.body;

    console.log("Register request:", { name, email, phone, idProofType });

    if (!name || !email || !password || !phone) {
      return res.json({ success: false, message: "All fields required" });
    }

    if (!req.file) {
      return res.json({ success: false, message: "ID proof upload is mandatory" });
    }

    if (!idProofType) {
      return res.json({ success: false, message: "Please select ID proof type" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      console.log("Email already exists:", email);
      return res.json({ success: false, message: "Email already exists" });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = new User({ 
      name, 
      email, 
      password: hash,
      phone,
      idProof: req.file.path,
      idProofType,
      verificationStatus: 'pending'
    });
    await user.save();

    console.log("User registered successfully (pending verification):", email);
    res.json({ 
      success: true,
      message: "Registration successful! Your account is pending admin verification. You will be able to login once approved."
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* LOGIN */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("Login request:", { email });

    if (!email || !password) {
      return res.json({ error: "Email and password required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log("User not found:", email);
      return res.json({ error: "Invalid credentials" });
    }

    // Check if user is banned
    if (user.isBanned) {
      console.log(`🚫 Banned user attempted login: ${email}`);
      return res.json({ 
        error: "ACCOUNT_BANNED",
        banned: true,
        banReason: user.banReason || 'Your account has been banned by admin due to policy violations',
        bannedAt: user.bannedAt,
        message: `⛔ Account Banned\n\n${user.banReason || 'Your account has been banned by admin due to policy violations'}\n\nIf you believe this is a mistake, please contact ASP support.`
      });
    }

    // Check verification status
    if (user.verificationStatus === 'pending') {
      console.log(`⏳ Pending verification user attempted login: ${email}`);
      return res.json({
        error: "VERIFICATION_PENDING",
        pending: true,
        message: "⏳ Account Pending Verification\n\nYour account is currently under review by our admin team. You will be able to login once your ID proof is verified.\n\nThis usually takes 24-48 hours. Thank you for your patience!"
      });
    }

    if (user.verificationStatus === 'rejected') {
      console.log(`❌ Rejected user attempted login: ${email}`);
      return res.json({
        error: "VERIFICATION_REJECTED",
        rejected: true,
        rejectionReason: user.rejectionReason || 'Your account verification was rejected',
        message: `❌ Account Verification Rejected\n\n${user.rejectionReason || 'Your account verification was rejected by admin'}\n\nPlease contact ASP support for more information.`
      });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      console.log("Invalid password for:", email);
      return res.json({ error: "Invalid credentials" });
    }

    console.log("Login successful:", email);
    res.json({
      ownerId: user._id,
      name: user.name,
      email: user.email,
      role: user.role || "user"
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;


/* ================= ADMIN ENDPOINTS ================= */

// Get all pending verifications
router.get("/admin/pending-verifications", async (req, res) => {
  try {
    const users = await User.find({ verificationStatus: 'pending' })
      .sort({ createdAt: -1 })
      .select('-password');
    
    console.log(`Found ${users.length} pending verifications`);
    res.json(users);
  } catch (err) {
    console.error("Get pending verifications error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get all users (for admin)
router.get("/admin/all-users", async (req, res) => {
  try {
    const users = await User.find()
      .sort({ createdAt: -1 })
      .select('-password');
    
    res.json(users);
  } catch (err) {
    console.error("Get all users error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Approve user verification
router.post("/admin/approve-user/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.json({ success: false, error: 'User not found' });
    }
    
    user.verificationStatus = 'approved';
    user.verifiedAt = new Date();
    user.verifiedBy = 'Admin';
    await user.save();
    
    console.log(`✅ User approved: ${user.name} (${user.email})`);
    
    res.json({
      success: true,
      message: 'User approved successfully',
      user: {
        name: user.name,
        email: user.email,
        verificationStatus: user.verificationStatus
      }
    });
  } catch (err) {
    console.error("Approve user error:", err);
    res.json({ success: false, error: err.message });
  }
});

// Reject user verification
router.post("/admin/reject-user/:userId", async (req, res) => {
  try {
    const { reason } = req.body;
    
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.json({ success: false, error: 'User not found' });
    }
    
    user.verificationStatus = 'rejected';
    user.rejectionReason = reason || 'ID verification failed';
    user.verifiedAt = new Date();
    user.verifiedBy = 'Admin';
    await user.save();
    
    console.log(`❌ User rejected: ${user.name} (${user.email}) - Reason: ${reason}`);
    
    res.json({
      success: true,
      message: 'User rejected',
      user: {
        name: user.name,
        email: user.email,
        verificationStatus: user.verificationStatus,
        rejectionReason: user.rejectionReason
      }
    });
  } catch (err) {
    console.error("Reject user error:", err);
    res.json({ success: false, error: err.message });
  }
});

// Ban user
router.post("/admin/ban-user/:userId", async (req, res) => {
  try {
    const { reason } = req.body;
    
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.json({ success: false, error: 'User not found' });
    }
    
    user.isBanned = true;
    user.banReason = reason || 'Account banned by admin';
    user.bannedAt = new Date();
    user.bannedBy = 'Admin';
    user.verificationStatus = 'rejected';
    await user.save();
    
    console.log(`🚫 User banned: ${user.name} (${user.email}) - Reason: ${reason}`);
    
    res.json({
      success: true,
      message: 'User banned successfully',
      user: {
        name: user.name,
        email: user.email,
        isBanned: user.isBanned,
        banReason: user.banReason
      }
    });
  } catch (err) {
    console.error("Ban user error:", err);
    res.json({ success: false, error: err.message });
  }
});

// Delete user
router.delete("/admin/delete-user/:userId", async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.userId);
    
    if (!user) {
      return res.json({ success: false, error: 'User not found' });
    }
    
    console.log(`🗑️ User deleted: ${user.name} (${user.email})`);
    
    res.json({
      success: true,
      message: 'User deleted successfully',
      user: {
        name: user.name,
        email: user.email
      }
    });
  } catch (err) {
    console.error("Delete user error:", err);
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
