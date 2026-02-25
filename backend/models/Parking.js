const mongoose = require("mongoose");

const ParkingSchema = new mongoose.Schema({
  ownerId: String,
  price: Number, // Keep for backward compatibility
  pricing: {
    type: Map,
    of: Number,
    default: {}
  }, // Pricing per vehicle type: { car: 50, bike: 20, bus: 100, heavy: 150 }
  slots: {
    type: Map,
    of: Number,
    default: {}
  }, // Slot capacity per vehicle type: { car: 4, bike: 10, bus: 2, heavy: 1 }
  notes: String,
  images: [String],
  vehicleTypes: {
    type: [String],
    default: ["car"]
  },
  location: {
    type: { type: String, default: "Point" },
    coordinates: [Number], // [longitude, latitude]
  },
  averageRating: {
    type: Number,
    default: 0
  },
  totalReviews: {
    type: Number,
    default: 0
  }
});

ParkingSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Parking", ParkingSchema);
