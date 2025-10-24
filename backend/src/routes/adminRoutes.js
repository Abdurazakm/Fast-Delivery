const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');
const User = require('../models/User');
const Order = require('../models/Order');

// create admin user (protected: only admin can create another admin)
router.post('/create-admin', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, phone, password } = req.body;
    if (!name || !phone || !password) return res.status(400).json({ message: 'Missing fields' });
    const existing = await User.findOne({ phone });
    if (existing) return res.status(400).json({ message: 'Phone already exists' });
    const user = new User({ name, phone, password, role: 'admin' });
    await user.save();
    res.json({ message: 'Admin created' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// simple stats endpoint
router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const ordersToday = await Order.countDocuments({ createdAt: { $gte: start } });
    const incomeTodayAgg = await Order.aggregate([
      { $match: { createdAt: { $gte: start } } },
      { $group: { _id: null, total: { $sum: "$total" } } }
    ]);
    const incomeToday = (incomeTodayAgg[0] && incomeTodayAgg[0].total) || 0;
    res.json({ ordersToday, incomeToday });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
