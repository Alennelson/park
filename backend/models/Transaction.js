const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema({
  ownerId: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['credit', 'debit'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  bookingId: {
    type: String
  },
  status: {
    type: String,
    enum: ['completed', 'pending', 'failed'],
    default: 'completed'
  },
  balanceAfter: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Transaction", TransactionSchema);
