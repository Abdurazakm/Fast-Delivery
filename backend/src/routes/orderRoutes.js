const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { normalizePhone, isValidPhone } = require("../utils/phone");
const checkServiceAvailability = require("../middlewares/serviceAvailability");
const { sendSMS } = require("../services/smsService");
const {
  authMiddleware,
  adminMiddleware,
} = require("../middlewares/authMiddleware");

// Helper: calculate price for an item
function calcUnitPrice(item) {
  let base = item.ertibType === "special" ? 135 : 110;
  if (item.extraKetchup) base += 10;
  if (item.extraFelafil) base += 15;
  return base;
}

// Prevent duplicate orders (same phone + similar items within 2 minutes)
async function isDuplicate(phone, items) {
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  const recentOrders = await prisma.order.findMany({
    where: { phone, createdAt: { gte: twoMinutesAgo } },
  });

  if (!recentOrders.length) return false;

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

  return recentOrders.some((o) => formatItems(o.items) === formatItems(items));
}

/**
 * ------------------------
 *  List Orders (Admin) with Date Filter
 * ------------------------
 */
router.get("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "20");
    const filterStatus = req.query.status;
    const dateStr = req.query.date; // YYYY-MM-DD format from frontend

    let where = {};

    if (filterStatus) {
      where.status = filterStatus;
    }

    if (dateStr) {
      const start = new Date(dateStr + "T00:00:00.000Z");
      const end = new Date(dateStr + "T23:59:59.999Z");
      where.createdAt = { gte: start, lte: end };
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    res.json({ data: orders, total, page, limit });
  } catch (err) {
    console.error("❌ Error listing orders:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * ------------------------
 *  Create Online Order
 * ------------------------
 */
router.post("/", checkServiceAvailability, async (req, res) => {
  try {
    const { customerName, phone, location, items } = req.body;

    if (
      !customerName ||
      !phone ||
      !location ||
      !Array.isArray(items) ||
      !items.length
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const normalizedPhone = normalizePhone(phone);
    if (!isValidPhone(normalizedPhone))
      return res.status(400).json({ message: "Invalid phone number" });

    if (await isDuplicate(normalizedPhone, items))
      return res.status(400).json({ message: "Duplicate order detected" });

    let total = 0;
    const builtItems = items.map((it) => {
      const unitPrice = calcUnitPrice(it);
      const quantity = parseInt(it.quantity) || 1;
      total += unitPrice * quantity;
      return { ...it, quantity, unitPrice, lineTotal: unitPrice * quantity };
    });

    const order = await prisma.order.create({
      data: {
        customerName,
        phone: normalizedPhone,
        location,
        source: "online",
        items: builtItems,
        smsHistory: [],
        total,
      },
    });

    // Non-blocking SMS
    const text = `✅ Hi ${customerName}! Your Ertib order is confirmed. Total: ${total} birr. We'll prepare it shortly.`;
    sendSMS(normalizedPhone, text)
      .then((smsResp) =>
        prisma.order
          .update({
            where: { id: order.id },
            data: {
              smsHistory: [
                ...order.smsHistory,
                {
                  type: "confirmation",
                  providerResponse: smsResp.info,
                  status: smsResp.status,
                },
              ],
            },
          })
          .catch((err) =>
            console.error("❌ Failed to update SMS history:", err)
          )
      )
      .catch((err) => console.error("❌ SMS send error:", err));

    res.json({ message: "Order placed successfully", orderId: order.id });
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

    if (
      !customerName ||
      !phone ||
      !location ||
      !Array.isArray(items) ||
      !items.length
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const normalizedPhone = normalizePhone(phone);
    if (!isValidPhone(normalizedPhone))
      return res.status(400).json({ message: "Invalid phone number" });

    let total = 0;
    const builtItems = items.map((it) => {
      const unitPrice = calcUnitPrice(it);
      const quantity = parseInt(it.quantity) || 1;
      total += unitPrice * quantity;
      return { ...it, quantity, unitPrice, lineTotal: unitPrice * quantity };
    });

    const order = await prisma.order.create({
      data: {
        customerName,
        phone: normalizedPhone,
        location,
        source: "manual",
        items: builtItems,
        smsHistory: [],
        total,
      },
    });

    const text = `✅ Hi ${customerName}! Your Ertib order is confirmed. Total: ${total} birr. We'll prepare it shortly.`;
    sendSMS(normalizedPhone, text)
      .then((smsResp) =>
        prisma.order
          .update({
            where: { id: order.id },
            data: {
              smsHistory: [
                ...order.smsHistory,
                {
                  type: "confirmation",
                  providerResponse: smsResp.info,
                  status: smsResp.status,
                },
              ],
            },
          })
          .catch((err) =>
            console.error("❌ Failed to update SMS history:", err)
          )
      )
      .catch((err) => console.error("❌ SMS send error:", err));

    res.json({ message: "Manual order created", orderId: order.id });
  } catch (err) {
    console.error("❌ Manual order error:", err);
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
    if (!allowedStatuses.includes(status))
      return res.status(400).json({ message: "Invalid status" });

    const order = await prisma.order.findUnique({
      where: { id: parseInt(id) },
    });
    if (!order) return res.status(404).json({ message: "Order not found" });

    let smsHistory = [...order.smsHistory];

    if (status === "arrived") {
      const text = `📍 Hi ${order.customerName}, your Ertib has arrived. Please come and take it.`;
      sendSMS(order.phone, text)
        .then((smsResp) => {
          prisma.order
            .update({
              where: { id: parseInt(id) },
              data: {
                smsHistory: [
                  ...smsHistory,
                  {
                    type: "arrival",
                    providerResponse: smsResp.info,
                    status: smsResp.status,
                  },
                ],
              },
            })
            .catch((err) =>
              console.error("❌ Failed to update SMS history:", err)
            );
        })
        .catch((err) => console.error("❌ SMS send error:", err));
    }

    await prisma.order.update({
      where: { id: parseInt(id) },
      data: { status },
    });

    res.json({ message: "Status updated", orderId: order.id });
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
router.post(
  "/resend-sms",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { orderId, type } = req.body;
      if (!orderId || !type)
        return res.status(400).json({ message: "Missing fields" });

      const order = await prisma.order.findUnique({
        where: { id: parseInt(orderId) },
      });
      if (!order) return res.status(404).json({ message: "Order not found" });

      let text;
      if (type === "confirmation")
        text = `✅ Hi ${order.customerName}! Your Ertib order is confirmed. Total: ${order.total} birr.`;
      else if (type === "arrival")
        text = `📍 Hi ${order.customerName}, your Ertib has arrived. Please come and take it.`;
      else return res.status(400).json({ message: "Invalid SMS type" });

      sendSMS(order.phone, text)
        .then((smsResp) =>
          prisma.order
            .update({
              where: { id: parseInt(orderId) },
              data: {
                smsHistory: [
                  ...order.smsHistory,
                  {
                    type,
                    providerResponse: smsResp.info,
                    status: smsResp.status,
                  },
                ],
              },
            })
            .catch((err) =>
              console.error("❌ Failed to update SMS history:", err)
            )
        )
        .catch((err) => console.error("❌ SMS send error:", err));

      res.json({ message: "SMS resend triggered" });
    } catch (err) {
      console.error("❌ Error resending SMS:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/**
 * ------------------------
 *  Delete Order (Admin)
 * ------------------------
 */
router.delete("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id: parseInt(id) },
    });
    if (!order) return res.status(404).json({ message: "Order not found" });

    await prisma.order.delete({ where: { id: parseInt(id) } });
    res.json({ message: "Order deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting order:", err);
    res.status(500).json({ message: "Server error while deleting order" });
  }
});

module.exports = router;
