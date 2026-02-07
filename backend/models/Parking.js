const mongoose = require("mongoose");

const ParkingSchema = new mongoose.Schema({
  ownerId: String,
  price: Number,
  notes: String,
  images: [String],
  location: {
    type: { type: String, default: "Point" },
    coordinates: [Number],
  },
});

module.exports = mongoose.model("Parking", ParkingSchema);
