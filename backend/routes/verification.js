const express = require("express");
const router = express.Router();
const Verification = require("../models/Verification");
const User = require("../models/user");
const crypto = require("crypto");

// Razorpay configuration
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_test_SETz7llzDcy8Ua";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "1myvqH79QLyk3jIa5KVArb3h";

// Initialize Razorpay
let razorpay;
try {
  const Razorpay = require("razorpay");
  razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET
  });
  console.log("✅ Razorpay initialized for verification");
} catch (err) {
  console.error("❌ Razorpay initialization failed:", err);
}

// Verification tier configurations
const VERIFICATION_TIERS = {
  silver: {
    name: "Silver - Basic Protection",
    monthlyFee: 299,
    priceBoost: 5, // 5% increase in parking price
    coverage: {
      outerBodyDamage: true,
      glassDamage: false,
      electricalIssues: false,
      majorBodyDamage: false,
      fireDamage: false,
      theftDamage: false
    },
    claimLimit: 10000,
    features: [
      "✓ Outer body damage coverage",
      "✓ Scratches & minor dents",
      "✓ Mirror damage",
      "✓ Claim limit: ₹10,000",
      "✓ Silver verified badge"
    ]
  },
  gold: {
    name: "Gold - Standard Protection",
    monthlyFee: 599,
    priceBoost: 10, // 10% increase
    coverage: {
      outerBodyDamage: true,
      glassDamage: true,
      electricalIssues: true,
      majorBodyDamage: false,
      fireDamage: false,
      theftDamage: false
    },
    claimLimit: 25000,
    features: [
      "✓ All Silver benefits",
      "✓ Glass damage coverage",
      "✓ Minor electrical issues",
      "✓ Claim limit: ₹25,000",
      "✓ Gold verified badge",
      "✓ Priority listing"
    ]
  },
  platinum: {
    name: "Platinum - Premium Full Coverage",
    monthlyFee: 999,
    priceBoost: 15, // 15% increase
    coverage: {
      outerBodyDamage: true,
      glassDamage: true,
      electricalIssues: true,
      majorBodyDamage: true,
      fireDamage: true,
      theftDamage: true
    },
    claimLimit: 50000,
    features: [
      "✓ All Gold benefits",
      "✓ Major body damage",
      "✓ Fire damage coverage",
      "✓ Theft protection",
      "✓ Claim limit: ₹50,000",
      "✓ Platinum verified badge",
      "✓ Top priority listing",
      "✓ 24/7 claim support"
    ]
  }
};

/* ================= GET VERIFICATION PLANS ================= */
router.get("/plans", (req, res) => {
  res.json(VERIFICATION_TIERS);
});

/* ================= TEST ROUTE ================= */
router.get("/test", (req, res) => {
  res.json({
    status: "ok",
    message: "Verification routes working",
    razorpayInitialized: !!razorpay,
    razorpayKeyId: RAZORPAY_KEY_ID ? "Set" : "Not set",
    razorpayKeySecret: RAZORPAY_KEY_SECRET ? "Set" : "Not set"
  });
});

/* ================= GET OWNER VERIFICATION STATUS ================= */
router.get("/status/:ownerId", async (req, res) => {
  try {
    const verification = await Verification.findOne({ 
      ownerId: req.params.ownerId,
      status: "active"
    });
    
    if (!verification) {
      return res.json({ verified: false });
    }
    
    res.json({
      verified: true,
      tier: verification.tier,
      expiresAt: verification.expiresAt,
      coverage: verification.coverage,
      claimLimit: verification.claimLimit,
      priceBoost: verification.priceBoost
    });
  } catch (err) {
    console.error("Get verification status error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= CREATE VERIFICATION ORDER ================= */
router.post("/create-order", async (req, res) => {
  try {
    const { ownerId, tier } = req.body;
    
    console.log("=== CREATE ORDER START ===");
    console.log("Request body:", { ownerId, tier });
    console.log("Razorpay instance exists:", !!razorpay);
    console.log("Razorpay key ID:", RAZORPAY_KEY_ID);
    
    if (!razorpay) {
      console.error("ERROR: Razorpay not initialized");
      return res.status(500).json({ 
        success: false,
        error: "Payment system not available",
        message: "Razorpay is not initialized on the server"
      });
    }
    
    if (!VERIFICATION_TIERS[tier]) {
      console.error("ERROR: Invalid tier:", tier);
      return res.status(400).json({ 
        success: false,
        error: "Invalid tier",
        message: `Tier '${tier}' is not valid. Valid tiers: silver, gold, platinum`
      });
    }
    
    const tierConfig = VERIFICATION_TIERS[tier];
    const amount = tierConfig.monthlyFee * 100; // Convert to paise
    
    // Generate short receipt (max 40 chars for Razorpay)
    const timestamp = Date.now().toString().slice(-8); // Last 8 digits
    const shortOwnerId = ownerId.toString().slice(-8); // Last 8 chars of ownerId
    const receipt = `v_${shortOwnerId}_${timestamp}`; // Format: v_12345678_12345678 (max 21 chars)
    
    console.log("Tier config:", tierConfig);
    console.log("Amount in paise:", amount);
    console.log("Receipt:", receipt, "Length:", receipt.length);
    console.log("Calling Razorpay orders.create...");
    
    const order = await razorpay.orders.create({
      amount: amount,
      currency: "INR",
      receipt: receipt
    });
    
    console.log("SUCCESS: Razorpay order created:", order.id);
    console.log("=== CREATE ORDER END ===");
    
    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: RAZORPAY_KEY_ID
    });
  } catch (err) {
    console.error("=== CREATE ORDER ERROR ===");
    console.error("Error name:", err.name);
    console.error("Error message:", err.message);
    console.error("Error code:", err.code);
    console.error("Full error:", JSON.stringify(err, null, 2));
    console.error("Error stack:", err.stack);
    
    // Extract Razorpay error details
    let errorMessage = "Unknown error";
    let errorCode = null;
    
    if (err.error && err.error.description) {
      errorMessage = err.error.description;
      errorCode = err.error.code;
    } else if (err.message) {
      errorMessage = err.message;
    }
    
    res.status(500).json({ 
      success: false,
      error: "Failed to create order", 
      message: errorMessage,
      errorName: err.name,
      errorCode: errorCode || err.code
    });
  }
});

/* ================= VERIFY PAYMENT & ACTIVATE ================= */
router.post("/verify-payment", async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      ownerId,
      tier
    } = req.body;
    
    console.log("Verifying payment:", { razorpay_order_id, razorpay_payment_id, ownerId, tier });
    
    // Verify signature
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");
    
    if (razorpay_signature !== expectedSign) {
      console.error("Invalid signature");
      return res.status(400).json({ success: false, error: "Invalid signature" });
    }
    
    console.log("Payment signature verified successfully");
    
    // Get tier configuration
    const tierConfig = VERIFICATION_TIERS[tier];
    
    if (!tierConfig) {
      console.error("Invalid tier:", tier);
      return res.status(400).json({ success: false, error: "Invalid tier" });
    }
    
    // Calculate expiry (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    console.log("Creating/updating verification for owner:", ownerId);
    
    // Create or update verification
    let verification = await Verification.findOne({ ownerId });
    
    if (verification) {
      console.log("Updating existing verification");
      // Update existing
      verification.tier = tier;
      verification.status = "active";
      verification.coverage = tierConfig.coverage;
      verification.claimLimit = tierConfig.claimLimit;
      verification.monthlyFee = tierConfig.monthlyFee;
      verification.priceBoost = tierConfig.priceBoost;
      verification.paymentId = razorpay_payment_id;
      verification.orderId = razorpay_order_id;
      verification.activatedAt = new Date();
      verification.expiresAt = expiresAt;
    } else {
      console.log("Creating new verification");
      // Create new
      verification = new Verification({
        ownerId,
        tier,
        status: "active",
        coverage: tierConfig.coverage,
        claimLimit: tierConfig.claimLimit,
        monthlyFee: tierConfig.monthlyFee,
        priceBoost: tierConfig.priceBoost,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        activatedAt: new Date(),
        expiresAt: expiresAt
      });
    }
    
    await verification.save();
    
    console.log("Verification saved successfully:", verification._id);
    
    res.json({ 
      success: true, 
      tier: tier,
      expiresAt: expiresAt
    });
  } catch (err) {
    console.error("Verify payment error:", err);
    res.status(500).json({ success: false, error: "Server error", details: err.message });
  }
});

/* ================= AUTO-EXPIRE VERIFICATIONS ================= */
// Run every hour to check for expired verifications
setInterval(async () => {
  try {
    const now = new Date();
    await Verification.updateMany(
      { status: "active", expiresAt: { $lte: now } },
      { status: "expired" }
    );
    console.log("Checked for expired verifications");
  } catch (err) {
    console.error("Auto-expire error:", err);
  }
}, 3600000); // Every hour

module.exports = router;

/* ================= ADMIN ENDPOINTS ================= */

// Process insurance claim (Admin)
router.post("/process-claim", async (req, res) => {
  try {
    const { userId, ticketId, claimAmount, reason } = req.body;
    
    // Get verification - try both ownerId and userId
    let verification = await Verification.findOne({ ownerId: userId, status: 'active' });
    if (!verification) {
      verification = await Verification.findOne({ userId: userId, status: 'active' });
    }
    
    if (!verification) {
      return res.json({ success: false, error: 'No active insurance found' });
    }
    
    // Check claim limit
    if (claimAmount > verification.claimLimit) {
      return res.json({ success: false, error: `Claim amount exceeds ${verification.tier} tier limit of ₹${verification.claimLimit}` });
    }
    
    // Credit to wallet
    const Wallet = require('../models/Wallet');
    const Transaction = require('../models/Transaction');
    
    let wallet = await Wallet.findOne({ ownerId: userId });
    if (!wallet) {
      wallet = new Wallet({ ownerId: userId });
    }
    
    wallet.balance += claimAmount;
    wallet.totalEarnings += claimAmount;
    wallet.lastTransaction = new Date();
    await wallet.save();
    
    // Create transaction with special message
    const transaction = new Transaction({
      ownerId: userId,
      type: 'credit',
      amount: claimAmount,
      description: `💰 Insurance Claim Approved - ₹${claimAmount} credited for your complaint. With regards, ASP Official Protection Team 🛡️`,
      balanceAfter: wallet.balance,
      metadata: {
        ticketId: ticketId,
        insuranceTier: verification.tier,
        claimReason: reason
      }
    });
    await transaction.save();
    
    // Update ticket to mark claim as processed
    if (ticketId) {
      const SupportTicket = require('../models/SupportTicket');
      await SupportTicket.findByIdAndUpdate(ticketId, {
        insuranceClaimProcessed: true,
        insuranceClaimAmount: claimAmount
      });
    }
    
    console.log(`✅ Insurance claim processed: ₹${claimAmount} credited to user ${userId} (${verification.tier.toUpperCase()} tier) for ticket ${ticketId}`);
    
    res.json({
      success: true,
      message: `Insurance claim approved! ₹${claimAmount} has been credited to your wallet. You can withdraw this amount anytime.`,
      claimAmount: claimAmount,
      newBalance: wallet.balance,
      transaction: transaction
    });
  } catch (err) {
    console.error("Process claim error:", err);
    res.json({ success: false, error: err.message });
  }
});
