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
