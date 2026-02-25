const express = require("express");
const router = express.Router();   // ⭐ THIS LINE FIXES YOUR ERROR
const multer = require("multer");
const Parking = require("../models/Parking");
const User = require("../models/user");
const Verification = require("../models/Verification");

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
    const { notes, ownerId, lat, lng, vehicleTypes, pricing, slots } = req.body;

    const imagePaths = req.files.map(file => "/uploads/" + file.filename);

    const parsedVehicleTypes = vehicleTypes ? JSON.parse(vehicleTypes) : ["car"];
    const parsedPricing = pricing ? JSON.parse(pricing) : {};
    const parsedSlots = slots ? JSON.parse(slots) : {};

    const parking = new Parking({
      ownerId,
      pricing: parsedPricing,
      slots: parsedSlots,
      notes,
      images: imagePaths,
      vehicleTypes: parsedVehicleTypes,
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
        
        // Get verification status
        const verification = await Verification.findOne({
          ownerId: spot.ownerId,
          status: "active"
        });
        
        const spotObj = spot.toObject();
        
        // Convert Map to plain object for pricing
        if (spotObj.pricing instanceof Map) {
          spotObj.pricing = Object.fromEntries(spotObj.pricing);
        }
        
        // Apply price boost if verified
        if (verification && spotObj.pricing) {
          const boost = verification.priceBoost / 100;
          for (const [vehicleType, price] of Object.entries(spotObj.pricing)) {
            spotObj.pricing[vehicleType] = Math.round(price * (1 + boost));
          }
        }

        return {
          ...spotObj,
          ownerName: owner ? owner.name : "Unknown",
          verification: verification ? {
            tier: verification.tier,
            badge: true
          } : null
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
    const { lat, lng, radius = 5000, vehicleType } = req.query; // radius in meters (default 5km)

    if (!lat || !lng) {
      return res.status(400).json({ error: "Latitude and longitude required" });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    console.log(`Searching parking near: ${latitude}, ${longitude} within ${radius}m for vehicle: ${vehicleType || 'all'}`);

    // Build query with vehicle type filter
    const query = {
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude] // [lng, lat] order for GeoJSON
          },
          $maxDistance: parseInt(radius) // in meters
        }
      }
    };

    // Add vehicle type filter if specified
    if (vehicleType) {
      query.vehicleTypes = vehicleType;
    }

    // MongoDB geospatial query - find parking within radius
    const spots = await Parking.find(query).limit(50); // Limit to 50 results

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

        const spotObj = spot.toObject();
        
        // Convert Map to plain object for pricing
        if (spotObj.pricing instanceof Map) {
          spotObj.pricing = Object.fromEntries(spotObj.pricing);
        }
        
        // Get verification status
        const verification = await Verification.findOne({
          ownerId: spot.ownerId,
          status: "active"
        });
        
        // Apply price boost if verified
        if (verification && spotObj.pricing) {
          const boost = verification.priceBoost / 100;
          for (const [vehicleType, price] of Object.entries(spotObj.pricing)) {
            spotObj.pricing[vehicleType] = Math.round(price * (1 + boost));
          }
        }

        return {
          ...spotObj,
          ownerName: owner ? owner.name : "Unknown",
          distance: Math.round(distance * 100) / 100, // Round to 2 decimals
          verification: verification ? {
            tier: verification.tier,
            badge: true
          } : null
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
    
    // Convert Map to plain object for pricing
    const result = spaces.map(space => {
      const spaceObj = space.toObject();
      if (spaceObj.pricing instanceof Map) {
        spaceObj.pricing = Object.fromEntries(spaceObj.pricing);
      }
      return spaceObj;
    });
    
    res.json(result);
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
    
    const spaceObj = space.toObject();
    
    // Convert Map to plain object for pricing
    if (spaceObj.pricing instanceof Map) {
      spaceObj.pricing = Object.fromEntries(spaceObj.pricing);
    }
    
    res.json(spaceObj);
  } catch (err) {
    console.error("GET SINGLE PARKING ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= UPDATE PARKING ================= */
router.put("/:id", upload.array("images", 3), async (req, res) => {
  try {
    const { notes, vehicleTypes, pricing } = req.body;
    
    const updateData = {
      notes
    };
    
    // Parse and update vehicle types if provided
    if (vehicleTypes) {
      updateData.vehicleTypes = JSON.parse(vehicleTypes);
    }
    
    // Parse and update pricing if provided
    if (pricing) {
      updateData.pricing = JSON.parse(pricing);
    }
    
    // Update images if new ones are provided
    if (req.files && req.files.length === 3) {
      const imagePaths = req.files.map(file => "/uploads/" + file.filename);
      updateData.images = imagePaths;
    }
    
    const space = await Parking.findByIdAndUpdate(
      req.params.id,
      updateData,
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
