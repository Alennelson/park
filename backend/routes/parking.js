const express = require("express");
const router = express.Router();   // ⭐ THIS LINE FIXES YOUR ERROR
const multer = require("multer");
const Parking = require("../models/Parking");
const User = require("../models/user");

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

/* ================= GET PARKING BY OWNER ================= */
router.get("/owner/:ownerId", async (req, res) => {
  try {
    const spaces = await Parking.find({ ownerId: req.params.ownerId });
    res.json(spaces);
  } catch (err) {
    console.error("GET OWNER PARKING ERROR:", err);
    res.status(500).json([]);
  }
});

/* ================= GET SINGLE PARKING ================= */
router.get("/:id", async (req, res) => {
  try {
    const space = await Parking.findById(req.params.id);
    if (!space) return res.status(404).json({ error: "Space not found" });
    res.json(space);
  } catch (err) {
    console.error("GET SINGLE PARKING ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= UPDATE PARKING ================= */
router.put("/:id", async (req, res) => {
  try {
    const { price, notes } = req.body;
    
    const space = await Parking.findByIdAndUpdate(
      req.params.id,
      { price, notes },
      { new: true }
    );
    
    if (!space) return res.status(404).json({ success: false, error: "Space not found" });
    
    res.json({ success: true, space });
  } catch (err) {
    console.error("UPDATE PARKING ERROR:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

/* ================= DELETE PARKING ================= */
router.delete("/:id", async (req, res) => {
  try {
    const space = await Parking.findByIdAndDelete(req.params.id);
    
    if (!space) return res.status(404).json({ success: false, error: "Space not found" });
    
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE PARKING ERROR:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

module.exports = router;   // ⭐ ALSO REQUIRED
