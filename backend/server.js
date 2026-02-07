const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const Booking = require("./models/Booking"); // ⭐ IMPORTANT


const app = express();

/* ================= MIDDLEWARE ================= */
app.use(cors());
app.use(express.json()); // parse JSON body
app.use("/uploads", express.static("uploads")); // serve uploaded files

/* ================= DATABASE ================= */
mongoose.connect("mongodb://127.0.0.1:27017/parkify")
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Error:", err));

/* ================= ROUTES ================= */
const parkingRoutes = require("./routes/parking");
const authRoutes = require("./routes/auth");
const ownerRoutes = require("./routes/owner");
const bookingRoutes = require("./routes/booking");

app.use("/api/parking", parkingRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/owner", ownerRoutes);
app.use("/api/booking", bookingRoutes);

/* ================= TEST ROUTE ================= */
app.get("/", (req, res) => {
  res.send("🚗 Parkify Server Running");
});

/* ================= START SERVER ================= */
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
});
setInterval(async () => {
  const now = new Date();

  await Booking.updateMany(
    { status: "active", endTime: { $lte: now } },
    { status: "completed" }
  );
}, 60000); // every 1 minute
const paymentRoutes = require("./routes/payment");
app.use("/api/payment", paymentRoutes);
