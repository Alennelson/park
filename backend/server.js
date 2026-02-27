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
const reviewRoutes = require("./routes/reviews");
const verificationRoutes = require("./routes/verification");
const reportRoutes = require("./routes/reports");
const supportRoutes = require("./routes/support");

app.use("/api/booking", bookingRoutes);
app.use("/api/parking", parkingRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/owner", ownerRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/verification", verificationRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/support", supportRoutes);

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
    console.log("=== PAYMENT COMPLETE START ===");
    console.log("Booking ID:", req.params.bookingId);
    
    const booking = await Booking.findById(req.params.bookingId);
    
    if (!booking) {
      console.error("Booking not found:", req.params.bookingId);
      return res.status(404).json({ success: false, error: "Booking not found" });
    }

    console.log("Booking found:", {
      id: booking._id,
      userId: booking.userId,
      parkingId: booking.parkingId,
      status: booking.status,
      startTime: booking.startTime
    });

    // IMPORTANT: Manually fetch parking since parkingId is stored as String, not ObjectId
    const Parking = require("./models/Parking");
    const parking = await Parking.findById(booking.parkingId);
    
    if (!parking) {
      console.error("Parking not found:", booking.parkingId);
      return res.status(404).json({ success: false, error: "Parking not found" });
    }
    
    console.log("Parking found:", {
      id: parking._id,
      ownerId: parking.ownerId
    });

    // Calculate payment amount based on actual minutes
    const startTime = new Date(booking.startTime);
    const endTime = new Date();
    const totalMinutes = Math.ceil((endTime - startTime) / (1000 * 60));
    const pricePerHour = booking.price || 50;
    const pricePerMinute = pricePerHour / 60;
    const totalAmount = Math.round(totalMinutes * pricePerMinute);

    console.log("Payment calculation:", {
      startTime,
      endTime,
      totalMinutes,
      pricePerHour,
      totalAmount
    });

    // Calculate commission breakdown
    const providerShare = Math.round(totalAmount * 0.82); // 82% to provider
    const commission = totalAmount - providerShare; // 18% company commission

    console.log("Commission breakdown:", {
      totalAmount,
      providerShare,
      commission
    });

    // Update booking status
    await Booking.findByIdAndUpdate(req.params.bookingId, {
      status: "completed",
      completedAt: endTime,
      endTime: endTime,
      totalAmount: totalAmount
    });

    console.log("Booking updated to completed");

    // Get driver details
    const User = require("./models/user");
    const driver = await User.findById(booking.userId);
    console.log("Driver found:", driver ? driver.name : "NOT FOUND");

    // Credit wallet (82% to provider)
    if (parking && parking.ownerId) {
      console.log("Crediting wallet for owner:", parking.ownerId);
      
      const Wallet = require("./models/Wallet");
      const Transaction = require("./models/Transaction");
      
      let wallet = await Wallet.findOne({ ownerId: parking.ownerId });
      
      if (!wallet) {
        console.log("Creating new wallet for owner:", parking.ownerId);
        wallet = new Wallet({ ownerId: parking.ownerId });
      } else {
        console.log("Existing wallet found. Current balance:", wallet.balance);
      }
      
      wallet.balance += providerShare;
      wallet.totalEarnings += providerShare;
      wallet.lastTransaction = new Date();
      await wallet.save();
      
      console.log("Wallet updated. New balance:", wallet.balance);
      
      // Create detailed transaction record
      const transaction = new Transaction({
        ownerId: parking.ownerId,
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
      
      console.log("Transaction created:", transaction._id);
      console.log(`✅ Payment completed: Total ₹${totalAmount}, Provider gets ₹${providerShare}, Commission ₹${commission}`);
      console.log("=== PAYMENT COMPLETE SUCCESS ===");
    } else {
      console.error("❌ Cannot credit wallet - parking or ownerId missing");
      console.error("parking:", parking);
      console.error("parking.ownerId:", parking ? parking.ownerId : 'N/A');
    }

    res.json({ success: true });

  } catch (err) {
    console.error("=== PAYMENT COMPLETE ERROR ===");
    console.error("Error:", err);
    console.error("Stack:", err.stack);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ================= FIX COMPLETED BOOKINGS (MANUAL CREDIT) ================= */
app.post("/api/payment/fix-completed-bookings/:ownerId", async (req, res) => {
  try {
    console.log("=== FIXING COMPLETED BOOKINGS ===");
    console.log("Owner ID:", req.params.ownerId);
    
    // Get all parking spaces for this owner
    const Parking = require("./models/Parking");
    const parkings = await Parking.find({ ownerId: req.params.ownerId });
    const parkingIds = parkings.map(p => p._id);
    
    console.log("Found parking spaces:", parkingIds.length);
    
    // Get all completed bookings for these parking spaces that don't have totalAmount
    const completedBookings = await Booking.find({
      parkingId: { $in: parkingIds },
      status: 'completed',
      totalAmount: { $exists: false } // Only bookings that haven't been processed
    }).populate('parkingId');
    
    console.log("Found unprocessed completed bookings:", completedBookings.length);
    
    if (completedBookings.length === 0) {
      return res.json({ 
        success: true, 
        message: "No unprocessed bookings found",
        processed: 0
      });
    }
    
    const Wallet = require("./models/Wallet");
    const Transaction = require("./models/Transaction");
    const User = require("./models/user");
    
    let wallet = await Wallet.findOne({ ownerId: req.params.ownerId });
    if (!wallet) {
      wallet = new Wallet({ ownerId: req.params.ownerId });
    }
    
    let totalCredited = 0;
    let processedCount = 0;
    
    for (const booking of completedBookings) {
      try {
        // Calculate payment
        const startTime = new Date(booking.startTime);
        const endTime = booking.endTime ? new Date(booking.endTime) : new Date();
        const totalMinutes = Math.ceil((endTime - startTime) / (1000 * 60));
        const pricePerHour = booking.price || 50;
        const pricePerMinute = pricePerHour / 60;
        const totalAmount = Math.round(totalMinutes * pricePerMinute);
        const providerShare = Math.round(totalAmount * 0.82);
        const commission = totalAmount - providerShare;
        
        // Get driver details
        const driver = await User.findById(booking.userId);
        
        // Update booking
        await Booking.findByIdAndUpdate(booking._id, {
          totalAmount: totalAmount,
          completedAt: endTime
        });
        
        // Credit wallet
        wallet.balance += providerShare;
        wallet.totalEarnings += providerShare;
        wallet.lastTransaction = new Date();
        
        // Create transaction
        const transaction = new Transaction({
          ownerId: req.params.ownerId,
          type: 'credit',
          amount: providerShare,
          description: `Parking payment from ${driver ? driver.name : 'Driver'} (Fixed)`,
          bookingId: booking._id,
          totalPayment: totalAmount,
          providerShare: providerShare,
          commission: commission,
          driverId: booking.userId,
          driverName: driver ? driver.name : 'Unknown',
          parkingDuration: totalMinutes,
          status: 'completed',
          balanceAfter: wallet.balance
        });
        await transaction.save();
        
        totalCredited += providerShare;
        processedCount++;
        
        console.log(`✅ Processed booking ${booking._id}: ₹${providerShare}`);
      } catch (err) {
        console.error(`❌ Error processing booking ${booking._id}:`, err);
      }
    }
    
    await wallet.save();
    
    console.log(`=== FIX COMPLETE: Credited ₹${totalCredited} from ${processedCount} bookings ===`);
    
    res.json({
      success: true,
      message: `Successfully credited ₹${totalCredited} from ${processedCount} bookings`,
      processed: processedCount,
      totalCredited: totalCredited,
      newBalance: wallet.balance
    });
    
  } catch (err) {
    console.error("Fix bookings error:", err);
    res.status(500).json({ success: false, error: err.message });
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
