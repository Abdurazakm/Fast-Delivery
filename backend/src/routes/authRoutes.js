const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { normalizePhone } = require("../utils/phone");

// ✅ Middleware to verify token
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

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
      return res
        .status(400)
        .json({ message: "Phone number already registered." });
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
    res
      .status(500)
      .json({ message: "Internal server error during registration." });
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
      { expiresIn: "720d" },
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

// ✅ Get current user info
router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1]; // Bearer <token>
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        phone: true,
        block: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("❌ Error fetching user:", err);
    res.status(401).json({ message: "Invalid or expired token" });
  }
});

// ✅ Update user profile (name, dorm block)
router.put("/profile", authMiddleware, async (req, res) => {
  try {
    const { name, block } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "Name is required." });
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name: name.trim(),
        block: block !== undefined ? String(block).trim() : undefined,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        block: true,
        role: true,
        createdAt: true,
      },
    });

    res.json({
      message: "Profile updated successfully.",
      user: updated,
    });
  } catch (err) {
    console.error("❌ Error updating profile:", err);
    res.status(500).json({ message: "Failed to update profile." });
  }
});

// ✅ Change user password securely
router.put("/change-password", authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Please provide both current and new password.",
      });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({
        message: "New password must be at least 4 characters long.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect current password." });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashed },
    });

    res.json({ message: "Password changed successfully." });
  } catch (err) {
    console.error("❌ Error changing password:", err);
    res.status(500).json({ message: "Failed to change password." });
  }
});

// ✅ Get user ordering statistics & insights
router.get("/stats", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, phone: true, createdAt: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const orders = await prisma.order.findMany({
      where: {
        OR: [{ userId: user.id }, { phone: user.phone }],
      },
      select: {
        id: true,
        total: true,
        status: true,
        paymentStatus: true,
        items: true,
        createdAt: true,
      },
    });

    const totalOrders = orders.length;
    const completedOrders = orders.filter((o) => o.status === "delivered").length;
    const activeOrders = orders.filter(
      (o) => !["delivered", "cancelled"].includes(o.status)
    ).length;

    const totalSpent = orders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    const foodCounts = {};
    for (const order of orders) {
      let items = [];
      try {
        items = Array.isArray(order.items)
          ? order.items
          : typeof order.items === "string"
            ? JSON.parse(order.items || "[]")
            : [];
      } catch {
        items = [];
      }

      for (const item of items) {
        const type = item.foodType || "ertib";
        const qty = Number(item.quantity) || 1;
        foodCounts[type] = (foodCounts[type] || 0) + qty;
      }
    }

    let favoriteFood = null;
    let maxCount = 0;
    for (const [food, count] of Object.entries(foodCounts)) {
      if (count > maxCount) {
        maxCount = count;
        favoriteFood = food;
      }
    }

    res.json({
      totalOrders,
      completedOrders,
      activeOrders,
      totalSpent: Math.round(totalSpent),
      favoriteFood: favoriteFood || "ertib",
      memberSince: user.createdAt,
    });
  } catch (err) {
    console.error("❌ Error fetching user stats:", err);
    res.status(500).json({ message: "Failed to fetch user statistics." });
  }
});

module.exports = router;
