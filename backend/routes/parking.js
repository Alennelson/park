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

/* ================= SEARCH NEARBY PARKING (5KM RADIUS) ================= */
router.get("/nearby", async (req, res) => {
  try {
    const { lat, lng, radius = 5000 } = req.query; // radius in meters (default 5km)

    if (!lat || !lng) {
      return res.status(400).json({ error: "Latitude and longitude required" });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    console.log(`Searching parking near: ${latitude}, ${longitude} within ${radius}m`);

    // MongoDB geospatial query - find parking within radius
    const spots = await Parking.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude] // [lng, lat] order for GeoJSON
          },
          $maxDistance: parseInt(radius) // in meters
        }
      }
    }).limit(50); // Limit to 50 results

    // Add owner names and calculate distance
    const result = await Promise.all(
      spots.map(async (spot) => {
        const owner = await User.findById(spot.ownerId);
        
        // Calculate distance using Haversine formula
        const distance = calculateDistance(
          latitude, 
          longitude, 
          spot.location.coordinates[1], 
          spot.location.coordinates[0]
        );

        return {
          ...spot.toObject(),
          ownerName: owner ? owner.name : "Unknown",
          distance: Math.round(distance * 100) / 100 // Round to 2 decimals
        };
      })
    );

    console.log(`Found ${result.length} parking spaces nearby`);
    res.json(result);
  } catch (err) {
    console.error("NEARBY SEARCH ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// Haversine formula to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

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
