const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/user");

/* REGISTER */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    console.log("Register request:", { name, email });

    if (!name || !email || !password) {
      return res.json({ success: false, message: "All fields required" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      console.log("Email already exists:", email);
      return res.json({ success: false, message: "Email already exists" });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = new User({ name, email, password: hash });
    await user.save();

    console.log("User registered successfully:", email);
    res.json({ success: true });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* LOGIN */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("Login request:", { email });

    if (!email || !password) {
      return res.json({ error: "Email and password required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log("User not found:", email);
      return res.json({ error: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      console.log("Invalid password for:", email);
      return res.json({ error: "Invalid credentials" });
    }

    console.log("Login successful:", email);
    res.json({
      ownerId: user._id,
      name: user.name,
      email: user.email,
      role: user.role || "user"
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
