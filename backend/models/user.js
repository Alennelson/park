const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  phone: String,
  role: { type: String, default: "user" },
  
  // Verification fields
  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  idProof: {
    type: String, // File path to uploaded ID
    default: ''
  },
  idProofType: {
    type: String, // 'aadhaar', 'passport', 'driving_license', 'voter_id', etc.
    default: ''
  },
  verifiedAt: Date,
  verifiedBy: String,
  rejectionReason: String,
  
  // Ban status
  isBanned: { type: Boolean, default: false },
  banReason: { type: String, default: '' },
  bannedAt: { type: Date },
  bannedBy: { type: String, default: 'Admin' }
}, {
  timestamps: true
});

module.exports = mongoose.model("User", UserSchema);
