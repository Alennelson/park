const mongoose = require("mongoose");

const ParkingSchema = new mongoose.Schema({
  ownerId: String,
  price: Number,
  notes: String,
  images: [String],
  vehicleTypes: {
    type: [String],
    default: ["car"] // Default to car if not specified
  },
  location: {
    type: { type: String, default: "Point" },
    coordinates: [Number], // [longitude, latitude]
  },
});

// Create geospatial index for location-based queries
ParkingSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Parking", ParkingSchema);
