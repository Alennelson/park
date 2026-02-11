const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema({
  parkingId: String,
  userId: String,
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

module.exports = mongoose.model("Booking", BookingSchema);
