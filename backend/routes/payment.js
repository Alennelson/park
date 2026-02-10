const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const router = express.Router();

/* 🔑 RAZORPAY CREDENTIALS FROM ENVIRONMENT */
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_SETz7llzDcy8Ua",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "1myvqH79QLyk3jIa5KVArb3h"
});

/* CREATE ORDER */
router.post("/create-order", async (req, res) => {
  try {
    const { amount, bookingId } = req.body;

    console.log("Creating order with:", { amount, bookingId });
    console.log("Using Razorpay key:", process.env.RAZORPAY_KEY_ID || "rzp_test_SCqhmRjFdQCDYM");

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: "Invalid amount" });
    }

    // Create shorter receipt (max 40 characters)
    const shortReceipt = `rcpt_${Date.now()}`;

    const order = await razorpay.orders.create({
      amount: amount * 100, // ₹ to paise
      currency: "INR",
      receipt: shortReceipt,
      notes: {
        bookingId: bookingId
      }
    });

    console.log("Order created successfully:", order.id);
    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_SETz7llzDcy8Ua"
    });
  } catch (err) {
    console.error("Create order error:", err);
    console.error("Error details:", {
      message: err.message,
      statusCode: err.statusCode,
      error: err.error
    });
    res.status(500).json({ 
      success: false, 
      error: err.message,
      details: err.error ? err.error.description : "Unknown error"
    });
  }
});

/* VERIFY PAYMENT */
router.post("/verify", (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const keySecret = process.env.RAZORPAY_KEY_SECRET || "1myvqH79QLyk3jIa5KVArb3h";
    
    const expected = crypto
      .createHmac("sha256", keySecret)
      .update(body.toString())
      .digest("hex");

    if (expected === razorpay_signature) {
      console.log("Payment verified successfully:", razorpay_payment_id);
      return res.json({ success: true, paymentId: razorpay_payment_id });
    } else {
      console.log("Payment verification failed");
      return res.json({ success: false, error: "Invalid signature" });
    }
  } catch (err) {
    console.error("Verify payment error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
