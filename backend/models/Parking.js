const mongoose = require("mongoose");

const ParkingSchema = new mongoose.Schema({
  ownerId: String,
  price: Number,
  notes: String,
  images: [String],
  location: {
    type: { type: String, default: "Point" },
    coordinates: [Number], // [longitude, latitude]
  },
});

// Create geospatial index for location-based queries
ParkingSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Parking", ParkingSchema);
