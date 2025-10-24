const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { normalizePhone, isValidPhone } = require('../utils/phone');
const checkServiceAvailability = require('../middlewares/serviceAvailability');
const { sendSMS } = require('../services/smsService');
const { authMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');
const jwt = require('jsonwebtoken');

/**
 * Helper price calculation
 */
function calcUnitPrice(item) {
  // base
  let base = item.ertibType === 'special' ? 135 : 110;
  if (item.extraKetchup) base += 10;
  if (item.extraFelafil) base += 15;
  return base;
}

/**
 * Duplicate prevention: check for same phone + items summary within last 2 minutes
 */
async function isDuplicate(phone, items) {
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  const recent = await Order.findOne({
    phone,
    createdAt: { $gte: twoMinutesAgo },
    total: { $exists: true } // simple filter to reduce noise
  });
  if (!recent) return false;
  // naive compare items: convert to JSON string
  const a = JSON.stringify(recent.items.map(i => ({ ertibType: i.ertibType, extraKetchup: i.extraKetchup, extraFelafil: i.extraFelafil, quantity: i.quantity })));
  const b = JSON.stringify(items.map(i => ({ ertibType: i.ertibType, extraKetchup: i.extraKetchup, extraFelafil: i.extraFelafil, quantity: i.quantity })));
  return a === b;
}

/**
 * Create online order (available only Mon-Thu)
 */
router.post('/', checkServiceAvailability, async (req, res) => {
  try {
    const { customerName, phone, location, items } = req.body;
    if (!customerName || !phone || !location || !items || !items.length) return res.status(400).json({ message: 'Missing fields' });

    const normalizedPhone = normalizePhone(phone);
    if (!isValidPhone(normalizedPhone)) return res.status(400).json({ message: 'Invalid phone' });

    if (await isDuplicate(normalizedPhone, items)) return res.status(400).json({ message: 'Duplicate order detected' });

    // build items with prices
    let total = 0;
    const builtItems = items.map(it => {
      const unit = calcUnitPrice(it);
      const lineTotal = unit * (it.quantity || 1);
      total += lineTotal;
      return {
        ertibType: it.ertibType,
        ketchup: it.ketchup !== undefined ? it.ketchup : true,
        spices: it.spices !== undefined ? it.spices : true,
        extraKetchup: !!it.extraKetchup,
        extraFelafil: !!it.extraFelafil,
        quantity: it.quantity || 1,
        unitPrice: unit,
        lineTotal
      };
    });

    const order = new Order({
      customerName,
      phone: normalizedPhone,
      location,
      items: builtItems,
      total,
      source: 'online'
    });

    // Save order
    await order.save();

    // send confirmation SMS (async)
    const text = `✅ Hi ${customerName}! Your Ertib order is confirmed. Total: ${total} birr. We'll prepare it shortly.`;
    const smsResp = await sendSMS(normalizedPhone, text);
    order.smsHistory.push({ type: 'confirmation', providerResponse: smsResp.info, status: smsResp.status });
    await order.save();

    return res.json({ message: 'Order placed', orderId: order._id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Admin (manual) order creation route
 * Protected by admin middleware
 */
router.post('/manual', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { customerName, phone, location, items } = req.body;
    if (!customerName || !phone || !location || !items || !items.length) return res.status(400).json({ message: 'Missing fields' });

    const normalizedPhone = normalizePhone(phone);
    if (!isValidPhone(normalizedPhone)) return res.status(400).json({ message: 'Invalid phone' });

    // build items
    let total = 0;
    const builtItems = items.map(it => {
      const unit = calcUnitPrice(it);
      const lineTotal = unit * (it.quantity || 1);
      total += lineTotal;
      return {
        ertibType: it.ertibType,
        ketchup: it.ketchup !== undefined ? it.ketchup : true,
        spices: it.spices !== undefined ? it.spices : true,
        extraKetchup: !!it.extraKetchup,
        extraFelafil: !!it.extraFelafil,
        quantity: it.quantity || 1,
        unitPrice: unit,
        lineTotal
      };
    });

    const order = new Order({
      customerName,
      phone: normalizedPhone,
      location,
      items: builtItems,
      total,
      source: 'phone'
    });
    await order.save();

    // send confirmation SMS
    const text = `✅ Hi ${customerName}! Your Ertib order is confirmed. Total: ${total} birr. We'll prepare it shortly.`;
    const smsResp = await sendSMS(normalizedPhone, text);
    order.smsHistory.push({ type: 'confirmation', providerResponse: smsResp.info, status: smsResp.status });
    await order.save();

    res.json({ message: 'Manual order saved', orderId: order._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * List orders (admin)
 * supports ?page= & ?limit= & ?status=
 */
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '20');
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const orders = await Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
    const total = await Order.countDocuments(filter);
    res.json({ data: orders, total, page, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Update order status (admin)
 * If status becomes 'arrived' or 'delivered' we may send arrival SMS
 */
router.put('/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // allow only certain transitions (basic)
    const allowed = ['pending', 'in_progress', 'arrived', 'delivered', 'canceled', 'no_show'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });

    order.status = status;
    await order.save();

    // send arrival SMS when status is 'arrived'
    if (status === 'arrived') {
      const text = `📍 Hi ${order.customerName}, your Ertib has arrived. Please come and take it.`;
      const smsResp = await sendSMS(order.phone, text);
      order.smsHistory.push({ type: 'arrival', providerResponse: smsResp.info, status: smsResp.status });
      await order.save();
    }

    res.json({ message: 'Status updated', orderId: order._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Resend SMS (admin) -> body: { orderId, type: 'confirmation'|'arrival' }
 */
router.post('/resend-sms', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { orderId, type } = req.body;
    if (!orderId || !type) return res.status(400).json({ message: 'Missing fields' });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    let text = '';
    if (type === 'confirmation') {
      text = `✅ Hi ${order.customerName}! Your Ertib order is confirmed. Total: ${order.total} birr.`;
    } else if (type === 'arrival') {
      text = `📍 Hi ${order.customerName}, your Ertib has arrived. Please come and take it.`;
    } else {
      return res.status(400).json({ message: 'Invalid type' });
    }

    const smsResp = await sendSMS(order.phone, text);
    order.smsHistory.push({ type, providerResponse: smsResp.info, status: smsResp.status });
    await order.save();

    res.json({ message: 'SMS resent', status: smsResp.status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
