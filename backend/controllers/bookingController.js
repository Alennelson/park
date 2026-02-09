const Booking = require("../models/Booking");

/* VERIFY OTP */
exports.verifyOtp = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("parking");

    if (!booking)
      return res.status(404).json({ success: false, message: "Booking not found" });

    if (booking.otp !== req.body.otp)
      return res.json({ success: false });

    booking.status = "active";
    await booking.save();

    res.json({ success: true });
  } catch (err) {
    console.log("OTP error:", err);
    res.status(500).json({ success: false });
  }
};
