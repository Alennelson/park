const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema({
  parkingId: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    default: ""
  },
  bookingId: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Review", ReviewSchema);
