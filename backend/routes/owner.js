const express = require("express");
const router = express.Router(); // ✅ THIS WAS MISSING
const ParkingOwner = require("../models/ParkingOwner");
const multer = require("multer");

/* ===========================
   MULTER CONFIGURATION
=========================== */
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

/* ===========================
   REGISTER OWNER (NO IMAGES)
=========================== */
router.post("/register", async (req, res) => {
  try {
    const owner = new ParkingOwner({
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      price: req.body.price,
      location: req.body.location,
      images: [] // images added later
    });

    await owner.save();

    res.json({
      message: "Owner registered successfully",
      ownerId: owner._id
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Registration failed" });
  }
});

/* ===========================
   UPLOAD PARKING IMAGES
=========================== */
router.post(
  "/upload-images/:ownerId",
  upload.array("images", 3),
  async (req, res) => {
    try {
      const owner = await ParkingOwner.findById(req.params.ownerId);

      if (!owner) {
        return res.status(404).json({ message: "Owner not found" });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "No images uploaded" });
      }

      const imageFiles = req.files.map(file => file.filename);

      owner.images.push(...imageFiles);
      await owner.save();

      res.json({ message: "Images uploaded successfully" });

    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Image upload failed" });
    }
  }
);

module.exports = router; // ✅ ALSO REQUIRED
router.get("/nearby", async (req, res) => {
  const { lat, lng } = req.query;

  const owners = await ParkingOwner.find({
    isActive: true,
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [Number(lng), Number(lat)]
        },
        $maxDistance: 5000
      }
    }
  });

  res.json(owners);
});

/* ================= ADMIN ENDPOINTS ================= */

// Get all users (Admin)
router.get("/all", async (req, res) => {
  try {
    const users = await ParkingOwner.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error("Get all users error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get single user (Admin)
router.get("/:userId", async (req, res) => {
  try {
    const user = await ParkingOwner.findById(req.params.userId);
    res.json(user);
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete provider account (Admin)
router.delete("/admin/delete/:providerId", async (req, res) => {
  try {
    const { reason } = req.body;
    
    // Instead of deleting, BAN the provider
    let provider = await ParkingOwner.findById(req.params.providerId);
    let providerType = 'ParkingOwner';
    
    // If not found in ParkingOwner, try User collection
    if (!provider) {
      const User = require('../models/user');
      provider = await User.findById(req.params.providerId);
      providerType = 'User';
    }
    
    if (!provider) {
      return res.json({ success: false, error: 'Provider not found in any collection' });
    }
    
    console.log(`Provider found in ${providerType} collection: ${provider.name} (${provider.email})`);
    
    // Mark as banned instead of deleting
    provider.isBanned = true;
    provider.banReason = reason || 'Account terminated by admin due to user reports';
    provider.bannedAt = new Date();
    provider.bannedBy = 'Admin';
    provider.isActive = false;
    await provider.save();
    
    console.log(`🚫 Provider BANNED: ${provider.name} (${provider.email})`);
    
    // Deactivate all parking spaces (don't delete, just hide)
    const Parking = require('../models/Parking');
    const updatedParkings = await Parking.updateMany(
      { ownerId: req.params.providerId },
      { isActive: false }
    );
    console.log(`Deactivated ${updatedParkings.modifiedCount} parking spaces`);
    
    // Cancel active bookings
    const Booking = require('../models/Booking');
    const updatedBookings = await Booking.updateMany(
      { ownerId: req.params.providerId, status: { $in: ['pending', 'confirmed', 'active'] } },
      { 
        status: 'cancelled', 
        notes: reason || 'Provider account banned by admin - booking cancelled'
      }
    );
    console.log(`Cancelled ${updatedBookings.modifiedCount} active bookings`);
    
    console.log(`✅ Provider ${provider.name} (${provider.email}) BANNED by admin. Reason: ${reason}`);
    
    res.json({
      success: true,
      message: 'Provider account banned and all associated data deactivated',
      bannedProvider: {
        name: provider.name,
        email: provider.email,
        collection: providerType,
        banReason: provider.banReason
      },
      deactivatedParkingSpaces: updatedParkings.modifiedCount,
      cancelledBookings: updatedBookings.modifiedCount
    });
  } catch (err) {
    console.error("Ban provider error:", err);
    res.json({ success: false, error: err.message });
  }
});
