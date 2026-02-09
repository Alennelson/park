const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const Booking = require("./models/Booking");

const app = express();

/* ================= MIDDLEWARE ================= */
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

/* ================= DATABASE ================= */
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/parkify";
mongoose.connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Error:", err));

/* ================= ROUTES ================= */
const parkingRoutes = require("./routes/parking");
const authRoutes = require("./routes/auth");
const ownerRoutes = require("./routes/owner");
const bookingRoutes = require("./routes/bookingRoutes");
const paymentRoutes = require("./routes/payment");
app.use("/api/booking", require("./routes/bookingRoutes"));
app.use("/api/parking", parkingRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/owner", ownerRoutes);
app.use("/api/booking", bookingRoutes);
app.use("/api/payment", paymentRoutes);

/* ================= FIXED BOOKING DRIVER ROUTE ================= */
/* This is REQUIRED for:
   ✔ Directions button
   ✔ Correct booking status
   ✔ Prevent old booking showing
*/
app.get("/api/booking/driver/:userId", async (req, res) => {
  try {
    const booking = await Booking.findOne({
      userId: req.params.userId,
      status: { $ne: "completed" }
    }).populate("parkingId"); // get parking full data

    if (!booking) return res.json(null);

    res.json({
      ...booking.toObject(),
      parking: booking.parkingId // send parking location to frontend
    });

  } catch (err) {
    console.error("Driver booking error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= FIXED PAYMENT COMPLETE ================= */
/* Prevent:
   ❌ old booking reappearing
   ❌ multiple payments
   ❌ timer restart bug
*/
app.post("/api/payment/complete/:bookingId", async (req, res) => {
  try {
    await Booking.findByIdAndUpdate(req.params.bookingId, {
      status: "completed",
      completedAt: new Date()
    });

    res.json({ success: true });

  } catch (err) {
    console.error("Payment complete error:", err);
    res.status(500).json({ success: false });
  }
});

/* ================= AUTO COMPLETE EXPIRED BOOKINGS ================= */
setInterval(async () => {
  const now = new Date();

  await Booking.updateMany(
    { status: "active", endTime: { $lte: now } },
    { status: "completed" }
  );
}, 60000); // every 1 minute

/* ================= TEST ROUTE ================= */
app.get("/", (req, res) => {
  res.send("🚗 Parkify Server Running");
});

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
});
