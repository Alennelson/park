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
const walletRoutes = require("./routes/wallet");

app.use("/api/booking", require("./routes/bookingRoutes"));
app.use("/api/parking", parkingRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/owner", ownerRoutes);
app.use("/api/booking", bookingRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/wallet", walletRoutes);

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
    const booking = await Booking.findById(req.params.bookingId).populate('parkingId');
    
    if (!booking) {
      return res.status(404).json({ success: false, error: "Booking not found" });
    }

    // Calculate payment amount based on actual minutes
    const startTime = new Date(booking.startTime);
    const endTime = new Date();
    const totalMinutes = Math.ceil((endTime - startTime) / (1000 * 60));
    const pricePerHour = booking.price || 50;
    const pricePerMinute = pricePerHour / 60;
    const totalAmount = Math.round(totalMinutes * pricePerMinute);

    // Calculate commission breakdown
    const providerShare = Math.round(totalAmount * 0.82); // 82% to provider
    const commission = totalAmount - providerShare; // 18% company commission

    // Update booking status
    await Booking.findByIdAndUpdate(req.params.bookingId, {
      status: "completed",
      completedAt: endTime,
      endTime: endTime,
      totalAmount: totalAmount
    });

    // Get driver details
    const User = require("./models/user");
    const driver = await User.findById(booking.userId);

    // Credit wallet (82% to provider)
    if (booking.parkingId && booking.parkingId.ownerId) {
      const Wallet = require("./models/Wallet");
      const Transaction = require("./models/Transaction");
      
      let wallet = await Wallet.findOne({ ownerId: booking.parkingId.ownerId });
      
      if (!wallet) {
        wallet = new Wallet({ ownerId: booking.parkingId.ownerId });
      }
      
      wallet.balance += providerShare;
      wallet.totalEarnings += providerShare;
      wallet.lastTransaction = new Date();
      await wallet.save();
      
      // Create detailed transaction record
      const transaction = new Transaction({
        ownerId: booking.parkingId.ownerId,
        type: 'credit',
        amount: providerShare,
        description: `Parking payment from ${driver ? driver.name : 'Driver'}`,
        bookingId: req.params.bookingId,
        // Payment breakdown
        totalPayment: totalAmount,
        providerShare: providerShare,
        commission: commission,
        // Driver details
        driverId: booking.userId,
        driverName: driver ? driver.name : 'Unknown',
        parkingDuration: totalMinutes,
        status: 'completed',
        balanceAfter: wallet.balance
      });
      await transaction.save();
      
      console.log(`Payment completed: Total ₹${totalAmount}, Provider gets ₹${providerShare}, Commission ₹${commission}`);
    }

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
  res.send("🅿️ ASP Server Running - A Space for Park");
});

/* ================= DATABASE TEST ROUTE ================= */
app.get("/api/test/db", async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    const states = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting"
    };
    
    // Try to count users
    const User = require("./models/user");
    const userCount = await User.countDocuments();
    
    res.json({
      status: "ok",
      database: states[dbState],
      mongodb: dbState === 1 ? "✅ Connected" : "❌ Not Connected",
      userCount: userCount,
      message: dbState === 1 ? "Database is working!" : "Database connection issue"
    });
  } catch (err) {
    res.status(500).json({ 
      error: err.message,
      mongodb: "❌ Error accessing database"
    });
  }
});

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
});
