const express = require("express");
const router = express.Router();   // ⭐ THIS LINE FIXES YOUR ERROR
const multer = require("multer");
const Parking = require("../models/Parking");
const User = require("../models/User");

/* ================= IMAGE UPLOAD SETUP ================= */
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

/* ================= REGISTER PARKING ================= */
router.post("/register", upload.array("images", 3), async (req, res) => {
  try {
    const { price, notes, ownerId, lat, lng } = req.body;

    const imagePaths = req.files.map(file => "/uploads/" + file.filename);

    const parking = new Parking({
      ownerId,
      price,
      notes,
      images: imagePaths,
      location: {
        type: "Point",
        coordinates: [lng, lat],
      },
    });

    await parking.save();

    res.json({ success: true });
  } catch (err) {
    console.error("REGISTER PARKING ERROR:", err);
    res.status(500).json({ success: false });
  }
});

/* ================= GET ALL PARKING WITH OWNER NAME ================= */
router.get("/all", async (req, res) => {
  try {
    const spots = await Parking.find();

    const result = await Promise.all(
      spots.map(async (spot) => {
        const owner = await User.findById(spot.ownerId);

        return {
          ...spot.toObject(),
          ownerName: owner ? owner.name : "Unknown",
        };
      })
    );

    res.json(result);
  } catch (err) {
    console.error("GET PARKING ERROR:", err);
    res.status(500).json([]);
  }
});

module.exports = router;   // ⭐ ALSO REQUIRED
