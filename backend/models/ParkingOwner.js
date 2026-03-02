const mongoose = require("mongoose");

const ownerSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  price: Number,

  images: [String],   // 👈 IMAGE FILE NAMES

  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: [Number]
  },

  isActive: { type: Boolean, default: true },
  
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
    type: String,
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

ownerSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("ParkingOwner", ownerSchema);
