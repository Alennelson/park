const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ParkingOwner',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['enquiry', 'complaint', 'technical', 'billing', 'feedback', 'other'],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  subject: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  attachments: [{
    type: String // File paths for uploaded images
  }],
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open'
  },
  adminResponse: {
    type: String,
    default: ''
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
supportTicketSchema.index({ userId: 1, status: 1 });
supportTicketSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
