const express = require("express");
const router = express.Router();
const Review = require("../models/Review");
const Parking = require("../models/Parking");

/* ================= SUBMIT REVIEW ================= */
router.post("/submit", async (req, res) => {
  try {
    const { parkingId, userId, userName, rating, comment, bookingId } = req.body;

    if (!parkingId || !userId || !rating) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    // Check if user already reviewed this parking
    const existingReview = await Review.findOne({ parkingId, userId, bookingId });
    if (existingReview) {
      return res.status(400).json({ success: false, error: "You already reviewed this parking" });
    }

    // Create review
    const review = new Review({
      parkingId,
      userId,
      userName,
      rating: parseInt(rating),
      comment: comment || "",
      bookingId
    });

    await review.save();

    // Update parking average rating
    const allReviews = await Review.find({ parkingId });
    const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / allReviews.length;

    await Parking.findByIdAndUpdate(parkingId, {
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      totalReviews: allReviews.length
    });

    res.json({ success: true, review });
  } catch (err) {
    console.error("SUBMIT REVIEW ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ================= GET REVIEWS FOR PARKING ================= */
router.get("/parking/:parkingId", async (req, res) => {
  try {
    const reviews = await Review.find({ parkingId: req.params.parkingId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(reviews);
  } catch (err) {
    console.error("GET REVIEWS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
