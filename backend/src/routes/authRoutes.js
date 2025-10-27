const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { normalizePhone } = require("../utils/phone");

// ✅ Register route
router.post("/register", async (req, res) => {
  try {
    const { name, phone, password, role, block } = req.body;

    // Validate required fields
    if (!name || !phone || !password) {
      return res.status(400).json({
        message: "Please fill all required fields (name, phone, password).",
      });
    }

    const normalized = normalizePhone(phone);

    // Check if phone already exists
    const existing = await prisma.user.findUnique({
      where: { phone: normalized },
    });
    if (existing) {
      return res.status(400).json({ message: "Phone number already registered." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        phone: normalized,
        block: block || "",
        password: hashedPassword,
        role: role || "user",
      },
    });

    return res.status(201).json({
      message: "Registration successful.",
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        block: user.block,
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
      return res.status(400).json({ message: "Please enter both phone and password." });
    }

    const normalized = normalizePhone(phone);
    const user = await prisma.user.findUnique({
      where: { phone: normalized },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid phone or password." });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: "Invalid phone or password." });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        phone: user.phone,
        block: user.block,
      },
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ message: "Internal server error during login." });
  }
});

module.exports = router;
