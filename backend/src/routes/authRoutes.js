const express = require("express");
const router = express.Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { normalizePhone } = require("../utils/phone");

// ✅ Register route (for both normal user and admin creation)
router.post("/register", async (req, res) => {
  try {
    const { name, phone, password, role, blockNumber } = req.body;

    // Validate required fields
    if (!name || !phone || !password) {
      return res
        .status(400)
        .json({ message: "Please fill all required fields (name, phone, password)." });
    }

    const normalized = normalizePhone(phone);

    // Check if phone already registered
    const existing = await User.findOne({ phone: normalized });
    if (existing) {
      return res.status(400).json({ message: "Phone number already registered." });
    }

    // Create user
    const user = new User({
      name,
      phone: normalized,
      password,
      blockNumber: blockNumber || "",
      role: role || "user",
    });

    await user.save();

    return res.status(201).json({
      message: "Registration successful.",
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        blockNumber: user.blockNumber,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("❌ Registration error:", err);
    res.status(500).json({ message: "Internal server error during registration." });
  }
});

// ✅ Login route
router.post("/login", async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res
        .status(400)
        .json({ message: "Please enter both phone and password." });
    }

    const normalized = normalizePhone(phone);
    const user = await User.findOne({ phone: normalized });

    if (!user) {
      return res.status(400).json({ message: "Invalid phone or password." });
    }

    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(400).json({ message: "Invalid phone or password." });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        phone: user.phone,
        blockNumber: user.blockNumber,
      },
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ message: "Internal server error during login." });
  }
});

module.exports = router;
