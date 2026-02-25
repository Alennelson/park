const mongoose = require("mongoose");

const verificationSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },
  tier: {
    type: String,
    enum: ["silver", "gold", "platinum"],
    required: true
  },
  status: {
    type: String,
    enum: ["pending", "active", "expired"],
    default: "pending"
  },
  // Insurance coverage details
  coverage: {
    outerBodyDamage: { type: Boolean, default: false },
    glassDamage: { type: Boolean, default: false },
    electricalIssues: { type: Boolean, default: false },
    majorBodyDamage: { type: Boolean, default: false },
    fireDamage: { type: Boolean, default: false },
    theftDamage: { type: Boolean, default: false }
  },
  claimLimit: {
    type: Number,
    default: 0
  },
  // Pricing
  monthlyFee: {
    type: Number,
    required: true
  },
  priceBoost: {
    type: Number,
    default: 0 // Percentage increase in parking price
  },
  // Payment details
  paymentId: String,
  orderId: String,
  // Dates
  activatedAt: Date,
  expiresAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Verification", verificationSchema);
