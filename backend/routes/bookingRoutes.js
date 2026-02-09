const express = require("express");
const router = express.Router();

const Booking = require("../models/Booking");
const User = require("../models/user");
const Parking = require("../models/Parking");


/* 1️⃣ DRIVER PRE-BOOK */
router.post("/create", async (req, res) => {
  try {
    const { parkingId, userId } = req.body;

    const booking = new Booking({
      parkingId,
      userId,
      status: "pending"
    });

    await booking.save();

    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
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