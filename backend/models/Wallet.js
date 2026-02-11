const mongoose = require("mongoose");

const WalletSchema = new mongoose.Schema({
  ownerId: {
    type: String,
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  lastTransaction: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Wallet", WalletSchema);
