const express = require("express");
const router = express.Router();

const Booking = require("../models/Booking");
const User = require("../models/user");
const Parking = require("../models/Parking");


/* 1️⃣ DRIVER PRE-BOOK */
router.post("/create", async (req, res) => {
  try {
    const { parkingId, userId, price, vehicleType } = req.body;

    console.log("=== BOOKING CREATE START ===");
    console.log("Request:", { parkingId, userId, price, vehicleType });

    if (!vehicleType) {
      return res.status(400).json({ 
        success: false, 
        error: "Vehicle type is required",
        message: "Please select a vehicle type"
      });
    }

    // Get parking details to check slot capacity
    const parking = await Parking.findById(parkingId);
    if (!parking) {
      return res.status(404).json({ 
        success: false, 
        error: "Parking spot not found" 
      });
    }

    // Convert Map to object for easier access
    const slotsObj = parking.slots ? Object.fromEntries(parking.slots) : {};
    const maxSlots = slotsObj[vehicleType] || 1; // Default to 1 if not specified

    console.log(`Parking has ${maxSlots} slots for ${vehicleType}`);

    // PESSIMISTIC LOCKING: Count active bookings for this vehicle type
    const activeBookingsCount = await Booking.countDocuments({
      parkingId: parkingId,
      vehicleType: vehicleType,
      status: { $in: ["pending", "confirmed", "active"] }
    });

    console.log(`Currently ${activeBookingsCount} active bookings for ${vehicleType}`);

    if (activeBookingsCount >= maxSlots) {
      console.log("BOOKING BLOCKED: All slots full for", vehicleType);
      return res.status(409).json({ 
        success: false, 
        error: "All slots are full",
        message: `All ${maxSlots} ${vehicleType} slots are currently occupied. Please try another spot or wait.`
      });
    }

    // Check if user already has an active booking
    const userActiveBooking = await Booking.findOne({
      userId: userId,
      status: { $in: ["pending", "confirmed", "active"] }
    });

    if (userActiveBooking) {
      console.log("BOOKING BLOCKED: User already has active booking:", userActiveBooking._id);
      return res.status(409).json({ 
        success: false, 
        error: "You already have an active booking",
        message: "Please complete or cancel your current booking before making a new one."
      });
    }

    // Get price
    let bookingPrice = price;
    if (!bookingPrice) {
      const pricingObj = parking.pricing ? Object.fromEntries(parking.pricing) : {};
      bookingPrice = pricingObj[vehicleType] || parking.price || 50;
    }

    // Create booking
    const booking = new Booking({
      parkingId,
      userId,
      vehicleType,
      price: bookingPrice,
      status: "pending",
      createdAt: new Date()
    });

    await booking.save();

    console.log("BOOKING CREATED:", booking._id, "for vehicle:", vehicleType);
    console.log(`Slots used: ${activeBookingsCount + 1}/${maxSlots}`);
    console.log("=== BOOKING CREATE END ===");

    res.json({ success: true, bookingId: booking._id });
  } catch (err) {
    console.error("BOOKING CREATE ERROR:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});


/* 2️⃣ OWNER GET ONLY HIS BOOKINGS */
router.get("/owner/:ownerId", async (req, res) => {
  try {
    const ownerId = req.params.ownerId;

    const parkings = await Parking.find({ ownerId });
    const parkingIds = parkings.map(p => p._id);

    const bookings = await Booking.find({
      parkingId: { $in: parkingIds }
    }).sort({ createdAt: -1 });

    const result = await Promise.all(
      bookings.map(async (b) => {
        const user = await User.findById(b.userId);

        return {
          ...b.toObject(),
          driverName: user ? user.name : "Unknown",
        };
      })
    );

    res.json(result);
  } catch (err) {
    console.log(err);
    res.status(500).json([]);
  }
});


/* 3️⃣ OWNER CONFIRM → GENERATE OTP */
router.post("/confirm/:id", async (req, res) => {
  try {
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: "confirmed", otp },
      { new: true }
    );

    res.json({ success: true, otp: booking.otp });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
});


/* 4️⃣ OWNER DECLINE */
router.post("/decline/:id", async (req, res) => {
  try {
    await Booking.findByIdAndUpdate(req.params.id, { status: "declined" });
    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
});


/* 5️⃣ VERIFY OTP → START PARKING */
router.post("/verify-otp/:id", async (req, res) => {
  try {
    const { otp } = req.body;

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.json({ success: false });

    if (String(booking.otp) !== String(otp)) {
      return res.json({ success: false, message: "Wrong OTP" });
    }

    // start parking
    booking.status = "active";
    booking.startTime = new Date();

    await booking.save();

    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
});


/* 6️⃣ DRIVER GET LATEST BOOKING */
router.get("/driver/:userId", async (req, res) => {
  try {
    const booking = await Booking.findOne({
      userId: req.params.userId,
      status: { $in: ["pending", "confirmed", "active"] }
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!booking) return res.json(null);

    const parking = await Parking.findById(booking.parkingId);

    res.json({
      ...booking,
      parking // ⭐ frontend expects this
    });
  } catch (err) {
    console.log(err);
    res.status(500).json(null);
  }
});


/* 7️⃣ DRIVER CANCEL BOOKING */
router.post("/cancel/:id", async (req, res) => {
  try {
    await Booking.findByIdAndUpdate(req.params.id, { status: "declined" });
    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
});


module.exports = router;