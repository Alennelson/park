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
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files (JPEG, JPG, PNG) are allowed"));
    }
  }
});

/* REGISTER WITH ID PROOF */
router.post("/register", upload.single("idProof"), async (req, res) => {
  try {
    console.log("=== REGISTRATION REQUEST RECEIVED ===");
    const { name, email, password, phone, idProofType } = req.body;

    console.log("Request body:", { name, email, phone, idProofType });
    console.log("File uploaded:", req.file ? {
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype
    } : "NO FILE");

    // Validation
    if (!name || !email || !password || !phone) {
      console.log("❌ Validation failed: Missing required fields");
      return res.json({ success: false, message: "All fields required" });
    }

    if (!req.file) {
      console.log("❌ Validation failed: No ID proof uploaded");
      return res.json({ success: false, message: "ID proof upload is mandatory" });
    }

    if (!idProofType) {
      console.log("❌ Validation failed: No ID proof type selected");
      return res.json({ success: false, message: "Please select ID proof type" });
    }

    // Check if email already exists
    const existing = await User.findOne({ email });
    if (existing) {
      console.log("❌ Email already exists:", email);
      return res.json({ success: false, message: "Email already exists" });
    }

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    // Convert image to Base64 for permanent storage in MongoDB
    const fs = require('fs');
    const imageBuffer = fs.readFileSync(req.file.path);
    const base64Image = imageBuffer.toString('base64');
    const imageDataUrl = `data:${req.file.mimetype};base64,${base64Image}`;
    
    console.log("✅ Image converted to Base64 for permanent storage");
    console.log("  - Original size:", req.file.size, "bytes");
    console.log("  - Base64 size:", base64Image.length, "characters");

    // Create user with Base64 image stored in database
    const user = new User({ 
      name, 
      email, 
      password: hash,
      phone,
      idProof: imageDataUrl, // Store Base64 data URL instead of file path
      idProofType,
      verificationStatus: 'pending'
    });
    
    await user.save();

    // Delete the temporary file from uploads folder
    try {
      fs.unlinkSync(req.file.path);
      console.log("✅ Temporary file deleted:", req.file.path);
    } catch (err) {
      console.log("⚠️ Could not delete temporary file:", err.message);
    }

    console.log("✅ User registered successfully:");
    console.log("  - Name:", user.name);
    console.log("  - Email:", user.email);
    console.log("  - Phone:", user.phone);
    console.log("  - ID Type:", user.idProofType);
    console.log("  - ID Proof: Stored as Base64 in database (permanent)");
    console.log("  - Status:", user.verificationStatus);
    console.log("  - User ID:", user._id);
    console.log("=== REGISTRATION SUCCESSFUL ===");
    
    res.json({ 
      success: true,
      message: "Registration successful! Your account is pending admin verification. You will be able to login once approved.",
      userId: user._id
    });
  } catch (err) {
    console.error("=== REGISTRATION ERROR ===");
    console.error("Error:", err);
    console.error("Stack:", err.stack);
    res.status(500).json({ success: false, message: "Server error: " + err.message });
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

/* ================= ADMIN ENDPOINTS ================= */

// Get all pending verifications
router.get("/admin/pending-verifications", async (req, res) => {
  try {
    console.log("=== ADMIN: FETCHING PENDING VERIFICATIONS ===");
    
    const users = await User.find({ verificationStatus: 'pending' })
      .sort({ createdAt: -1 })
      .select('-password');
    
    console.log(`✅ Found ${users.length} pending verifications`);
    
    if (users.length > 0) {
      console.log("Pending users:");
      users.forEach((u, i) => {
        console.log(`  ${i + 1}. ${u.name} (${u.email}) - ${u.idProofType} - Registered: ${u.createdAt}`);
      });
    }
    
    res.json(users);
  } catch (err) {
    console.error("=== GET PENDING VERIFICATIONS ERROR ===");
    console.error("Error:", err);
    console.error("Stack:", err.stack);
    res.status(500).json({ error: "Server error: " + err.message });
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

/* ================= FORGOT PASSWORD (Gmail OTP) ================= */

const nodemailer = require('nodemailer');

// In-memory OTP store: { email: { otp, expiresAt } }
const otpStore = {};

// Step 1: Send OTP via Gmail
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.json({ success: false, message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.json({ success: false, message: "No account found with this email" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = { otp, expiresAt: Date.now() + 10 * 60 * 1000 };

    const transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,       // your Brevo login email
        pass: process.env.BREVO_SMTP_KEY    // Brevo SMTP key (not your password)
      }
    });

    await transporter.sendMail({
      from: `"ASP - A Space for Park" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "ASP Password Reset OTP",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:30px;background:#fff;border-radius:12px;border:2px solid #FFD400;">
          <h2 style="text-align:center;color:#000;">&#128663; ASP Password Reset</h2>
          <p>Hi <b>${user.name}</b>,</p>
          <p>Use the OTP below to reset your password. It expires in <b>10 minutes</b>.</p>
          <div style="text-align:center;margin:25px 0;">
            <span style="font-size:38px;font-weight:bold;letter-spacing:12px;background:#FFD400;padding:15px 25px;border-radius:10px;">${otp}</span>
          </div>
          <p style="color:#999;font-size:12px;text-align:center;">If you did not request this, ignore this email.</p>
          <p style="color:#999;font-size:12px;text-align:center;">— ASP Team</p>
        </div>
      `
    });

    console.log(`OTP sent to ${email}`);
    res.json({ success: true, message: "OTP sent to your email" });
  } catch (err) {
    console.error("Forgot password error:", err.message);
    res.json({ success: false, message: "Failed to send OTP. Please try again." });
  }
});

// Step 2: Verify OTP and reset password
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.json({ success: false, message: "All fields required" });

    const record = otpStore[email];
    if (!record) return res.json({ success: false, message: "No OTP requested for this email" });
    if (Date.now() > record.expiresAt) {
      delete otpStore[email];
      return res.json({ success: false, message: "OTP expired. Please request a new one." });
    }
    if (record.otp !== otp) return res.json({ success: false, message: "Invalid OTP" });

    const hash = await bcrypt.hash(newPassword, 10);
    await User.findOneAndUpdate({ email }, { password: hash });
    delete otpStore[email];

    console.log(`Password reset for: ${email}`);
    res.json({ success: true, message: "Password reset successfully! You can now login." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.json({ success: false, message: "Server error" });
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
