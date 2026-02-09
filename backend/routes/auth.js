const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/user");

/* REGISTER */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.json({ success: false, message: "Email exists" });

    const hash = await bcrypt.hash(password, 10);

    const user = new User({ name, email, password: hash });
    await user.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

/* LOGIN */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.json({});

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.json({});

    res.json({
      ownerId: user._id,
      name: user.name,
      email: user.email
    });
  } catch {
    res.status(500).json({});
  }
});

module.exports = router;
