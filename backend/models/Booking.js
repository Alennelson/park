const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema({
  parkingId: String,
  userId: String,

  status: {
    type: String,
    enum: ["pending", "confirmed", "active", "completed", "declined"],
    default: "pending",
  },

  otp: String,
  startTime: Date,
  endTime: Date,
  totalPrice: Number,

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Booking", BookingSchema);
