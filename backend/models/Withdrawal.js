const mongoose = require("mongoose");

const WithdrawalSchema = new mongoose.Schema({
  ownerId: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  accountHolderName: {
    type: String,
    required: true
  },
  accountNumber: {
    type: String,
    required: true
  },
  ifscCode: {
    type: String,
    required: true
  },
  upiId: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending'
  },
  requestDate: {
    type: Date,
    default: Date.now
  },
  processedDate: {
    type: Date
  },
  adminNotes: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Withdrawal", WithdrawalSchema);
