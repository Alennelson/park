const express = require("express");
const router = express.Router();
const Verification = require("../models/Verification");
const User = require("../models/user");
const Razorpay = require("razorpay");
const crypto = require("crypto");

// Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_SETz7llzDcy8Ua",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "1myvqH79QLyk3jIa5KVArb3h"
});

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
    
    if (!VERIFICATION_TIERS[tier]) {
      return res.status(400).json({ error: "Invalid tier" });
    }
    
    const tierConfig = VERIFICATION_TIERS[tier];
    const amount = tierConfig.monthlyFee * 100; // Convert to paise
    
    const order = await razorpay.orders.create({
      amount: amount,
      currency: "INR",
      receipt: `verify_${ownerId}_${Date.now()}`
    });
    
    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_SETz7llzDcy8Ua"
    });
  } catch (err) {
    console.error("Create verification order error:", err);
    res.status(500).json({ error: "Failed to create order" });
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
    
    // Verify signature
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "1myvqH79QLyk3jIa5KVArb3h")
      .update(sign.toString())
      .digest("hex");
    
    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({ success: false, error: "Invalid signature" });
    }
    
    // Get tier configuration
    const tierConfig = VERIFICATION_TIERS[tier];
    
    // Calculate expiry (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    // Create or update verification
    let verification = await Verification.findOne({ ownerId });
    
    if (verification) {
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
    
    res.json({ 
      success: true, 
      tier: tier,
      expiresAt: expiresAt
    });
  } catch (err) {
    console.error("Verify payment error:", err);
    res.status(500).json({ success: false, error: "Server error" });
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
