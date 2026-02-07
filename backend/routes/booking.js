const express = require("express");
const router = express.Router();

const Booking = require("../models/Booking");
const User = require("../models/User");
const Parking = require("../models/Parking"); // ⭐ ADD THIS LINE


/* 1️⃣ DRIVER PRE-BOOK */
router.post("/create", async (req, res) => {
  try {
    const { parkingId, userId } = req.body;

    const booking = new Booking({ parkingId, userId });
    await booking.save();

    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false });
  }
});


/* 2️⃣ OWNER GET INBOX BOOKINGS */
/* OWNER GET ONLY HIS BOOKINGS */
router.get("/owner/:ownerId", async (req, res) => {
  try {
    const ownerId = req.params.ownerId;

    const parkings = await Parking.find({ ownerId });
    const parkingIds = parkings.map(p => p._id.toString());

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
  } catch {
    res.status(500).json({ success: false });
  }
});


/* 4️⃣ OWNER DECLINE */
router.post("/decline/:id", async (req, res) => {
  try {
    await Booking.findByIdAndUpdate(req.params.id, { status: "declined" });
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false });
  }
});


/* 5️⃣ OWNER VERIFY OTP → START PARKING */
/* VERIFY OTP */
router.post("/verify-otp/:id", async (req, res) => {
  try {
    const { otp } = req.body;

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.json({ success: false });

    if (String(booking.otp) !== String(otp)) {
      return res.json({ success: false, message: "Wrong OTP" });
    }

    // start timer
    booking.status = "active";
    booking.startTime = new Date();

    // example: 1 hour parking
    const HOURS = 1;
    booking.endTime = new Date(Date.now() + HOURS * 60 * 60 * 1000);

    // get parking price
    const parking = await Parking.findById(booking.parkingId);
    booking.totalPrice = parking.price * HOURS;

    await booking.save();

    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
});


module.exports = router;
/* DRIVER GET LATEST BOOKING */
router.get("/driver/:userId", async (req, res) => {
  try {
    const booking = await Booking.findOne({
      userId: req.params.userId,
      status: { $in: ["pending", "confirmed"] }
    })
    .sort({ createdAt: -1 }) // ⭐ VERY IMPORTANT
    .lean();

    if (!booking) return res.json(null);

    // attach parking location
    const parking = await Parking.findById(booking.parkingId);

    res.json({
      ...booking,
      location: parking?.location
    });
  } catch (err) {
    console.log(err);
    res.status(500).json(null);
  }
});




/* DRIVER CANCEL BOOKING */
router.post("/cancel/:id", async (req, res) => {
  try {
    await Booking.findByIdAndUpdate(req.params.id, { status: "declined" });
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false });
  }
});
