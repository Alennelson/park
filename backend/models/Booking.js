const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema({
  parkingId: String,
  userId: String,
  vehicleType: {
    type: String,
    enum: ["car", "bike", "bus", "heavy"],
    required: true
  },
  price: Number, // Price per hour from parking space

  status: {
    type: String,
    enum: ["pending", "confirmed", "active", "completed", "declined"],
    default: "pending",
  },

  otp: String,
  startTime: Date,
  endTime: Date,
  totalAmount: Number, // Total amount paid

  createdAt: { type: Date, default: Date.now },
});

// Indexes for pessimistic locking and fast queries (vehicle-specific)
BookingSchema.index({ parkingId: 1, vehicleType: 1, status: 1 }); // Fast lookup for active bookings on a parking spot per vehicle type
BookingSchema.index({ userId: 1, status: 1 }); // Fast lookup for user's active bookings
BookingSchema.index({ createdAt: -1 }); // Fast sorting by creation date

module.exports = mongoose.model("Booking", BookingSchema);
