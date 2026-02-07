const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const router = express.Router();

/* 🔑 PUT YOUR TEST KEYS HERE */
const razorpay = new Razorpay({
  key_id: "rzp_test_SCqhmRjFdQCDYM",
  key_secret: "ixizAmYHqiNtvGP3yUkLBoRe"
});

/* CREATE ORDER */
router.post("/create-order", async (req, res) => {
  try {
    const { amount } = req.body;

    const order = await razorpay.orders.create({
      amount: amount * 100, // ₹ to paise
      currency: "INR",
      receipt: "receipt_" + Date.now()
    });

    res.json(order);
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
});

/* VERIFY PAYMENT */
router.post("/verify", (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expected = crypto
      .createHmac("sha256", "ixizAmYHqiNtvGP3yUkLBoRe") // SAME key_secret
      .update(body.toString())
      .digest("hex");

    if (expected === razorpay_signature) {
      return res.json({ success: true });
    } else {
      return res.json({ success: false });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
