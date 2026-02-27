const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  parkingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Parking',
    required: true
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ParkingOwner',
    required: true
  },
  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ParkingOwner',
    required: true
  },
  reporterName: {
    type: String,
    required: true
  },
  reporterEmail: {
    type: String,
    required: true
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 2
  },
  reasons: [{
    type: String,
    enum: ['dirty', 'unsafe', 'misleading', 'rude', 'overpriced', 'unavailable', 'other']
  }],
  details: {
    type: String,
    default: ''
  },
  reviewComment: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'investigating', 'resolved', 'dismissed'],
    default: 'pending'
  },
  adminNotes: {
    type: String,
    default: ''
  },
  actionTaken: {
    type: String,
    enum: ['none', 'warning', 'suspension', 'removal'],
    default: 'none'
  },
  resolvedAt: {
    type: Date
  },
  resolvedBy: {
    type: String
  }
}, {
  timestamps: true
});

// Index for faster queries
reportSchema.index({ parkingId: 1, status: 1 });
reportSchema.index({ providerId: 1, status: 1 });
reportSchema.index({ reporterId: 1 });

module.exports = mongoose.model('Report', reportSchema);
