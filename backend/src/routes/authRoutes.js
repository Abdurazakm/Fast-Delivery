const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { normalizePhone } = require('../utils/phone');

// register (for admin you can create with role admin)
router.post('/register', async (req, res) => {
  try {
    const { name, phone, email, password, role } = req.body;
    if (!name || !phone || !password) return res.status(400).json({ message: 'Missing fields' });

    const normalized = normalizePhone(phone);
    const existing = await User.findOne({ phone: normalized });
    if (existing) return res.status(400).json({ message: 'Phone already registered' });

    const user = new User({ name, phone: normalized, email, password, role: role || 'user' });
    await user.save();
    return res.json({ message: 'Registered' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// login
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ message: 'Missing fields' });

    const normalized = normalizePhone(phone);
    const user = await User.findOne({ phone: normalized });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const match = await user.comparePassword(password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, role: user.role, name: user.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
