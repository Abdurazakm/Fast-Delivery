const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const { normalizePhone, isValidPhone } = require("../utils/phone");
const checkServiceAvailability = require("../middlewares/serviceAvailability");
const { sendSMS } = require("../services/smsService");
const { authMiddleware, adminMiddleware } = require("../middlewares/authMiddleware");
const jwt = require("jsonwebtoken");

/**
 * Helper: calculate price for an item
 */
function calcUnitPrice(item) {
  let base = item.ertibType === "special" ? 135 : 110;
  if (item.extraKetchup) base += 10;
  if (item.extraFelafil) base += 15;
  return base;
}

/**
 * Prevent duplicate orders: same phone + similar items within last 2 minutes
 */
async function isDuplicate(phone, items) {
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

  const recent = await Order.findOne({
    phone,
    createdAt: { $gte: twoMinutesAgo },
  });

  if (!recent) return false;

  const formatItems = (arr) =>
    JSON.stringify(
      arr.map((i) => ({
        ertibType: i.ertibType,
        ketchup: !!i.ketchup,
        spices: !!i.spices,
        extraKetchup: !!i.extraKetchup,
        extraFelafil: !!i.extraFelafil,
        quantity: i.quantity || 1,
      }))
    );

  return formatItems(recent.items) === formatItems(items);
}

/**
 * ------------------------
 *  Create Online Order
 * ------------------------
 */
router.post("/", checkServiceAvailability, async (req, res) => {
  try {
    const { customerName, phone, location, items } = req.body;

    if (!customerName || !phone || !location || !Array.isArray(items) || !items.length) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const normalizedPhone = normalizePhone(phone);
    if (!isValidPhone(normalizedPhone)) {
      return res.status(400).json({ message: "Invalid phone number" });
    }

    if (await isDuplicate(normalizedPhone, items)) {
      return res.status(400).json({ message: "Duplicate order detected" });
    }

    // Build items + calculate total
    let total = 0;
    const builtItems = items.map((it) => {
      const unitPrice = calcUnitPrice(it);
      const quantity = parseInt(it.quantity) || 1;
      const lineTotal = unitPrice * quantity;
      total += lineTotal;

      return {
        ertibType: it.ertibType || "normal",
        ketchup: !!it.ketchup,
        spices: !!it.spices,
        extraKetchup: !!it.extraKetchup,
        extraFelafil: !!it.extraFelafil,
        quantity,
        unitPrice,
        lineTotal,
      };
    });

    const order = new Order({
      customerName,
      phone: normalizedPhone,
      location,
      items: builtItems,
      total,
      source: "online",
    });

    await order.save();

    // Send confirmation SMS (non-blocking)
    const text = `✅ Hi ${customerName}! Your Ertib order is confirmed. Total: ${total} birr. We'll prepare it shortly.`;
    const smsResp = await sendSMS(normalizedPhone, text);
    order.smsHistory.push({
      type: "confirmation",
      providerResponse: smsResp.info,
      status: smsResp.status,
    });
    await order.save();

    res.json({ message: "Order placed successfully", orderId: order._id });
  } catch (err) {
    console.error("❌ Error creating order:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * ------------------------
 *  Manual Order (Admin)
 * ------------------------
 */
router.post("/manual", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { customerName, phone, location, items } = req.body;

    if (!customerName || !phone || !location || !Array.isArray(items) || !items.length) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const normalizedPhone = normalizePhone(phone);
    if (!isValidPhone(normalizedPhone)) {
      return res.status(400).json({ message: "Invalid phone number" });
    }

    let total = 0;
    const builtItems = items.map((it) => {
      const unitPrice = calcUnitPrice(it);
      const quantity = parseInt(it.quantity) || 1;
      const lineTotal = unitPrice * quantity;
      total += lineTotal;
      return {
        ertibType: it.ertibType || "normal",
        ketchup: !!it.ketchup,
        spices: !!it.spices,
        extraKetchup: !!it.extraKetchup,
        extraFelafil: !!it.extraFelafil,
        quantity,
        unitPrice,
        lineTotal,
      };
    });

    const order = new Order({
      customerName,
      phone: normalizedPhone,
      location,
      items: builtItems,
      total,
      source: "manual",
    });

    await order.save();

    const text = `✅ Hi ${customerName}! Your Ertib order is confirmed. Total: ${total} birr.`;
    const smsResp = await sendSMS(normalizedPhone, text);
    order.smsHistory.push({
      type: "confirmation",
      providerResponse: smsResp.info,
      status: smsResp.status,
    });
    await order.save();

    res.json({ message: "Manual order created", orderId: order._id });
  } catch (err) {
    console.error("❌ Manual order error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * ------------------------
 *  List Orders (Admin)
 * ------------------------
 */
router.get("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "20");
    const filter = req.query.status ? { status: req.query.status } : {};

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Order.countDocuments(filter),
    ]);

    res.json({ data: orders, total, page, limit });
  } catch (err) {
    console.error("❌ Error listing orders:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * ------------------------
 *  Update Order Status
 * ------------------------
 */
router.put("/:id/status", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "pending",
      "in_progress",
      "arrived",
      "delivered",
      "canceled",
      "no_show",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.status = status;
    await order.save();

    if (status === "arrived") {
      const text = `📍 Hi ${order.customerName}, your Ertib has arrived. Please come and take it.`;
      const smsResp = await sendSMS(order.phone, text);
      order.smsHistory.push({
        type: "arrival",
        providerResponse: smsResp.info,
        status: smsResp.status,
      });
      await order.save();
    }

    res.json({ message: "Status updated", orderId: order._id });
  } catch (err) {
    console.error("❌ Error updating status:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * ------------------------
 *  Resend SMS
 * ------------------------
 */
router.post("/resend-sms", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { orderId, type } = req.body;
    if (!orderId || !type) return res.status(400).json({ message: "Missing fields" });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    let text;
    if (type === "confirmation") {
      text = `✅ Hi ${order.customerName}! Your Ertib order is confirmed. Total: ${order.total} birr.`;
    } else if (type === "arrival") {
      text = `📍 Hi ${order.customerName}, your Ertib has arrived. Please come and take it.`;
    } else {
      return res.status(400).json({ message: "Invalid SMS type" });
    }

    const smsResp = await sendSMS(order.phone, text);
    order.smsHistory.push({
      type,
      providerResponse: smsResp.info,
      status: smsResp.status,
    });
    await order.save();

    res.json({ message: "SMS resent", status: smsResp.status });
  } catch (err) {
    console.error("❌ Error resending SMS:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
