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

const {
  getUserIdMiddleware,
} = require("../middlewares/getUserIdMiddleware.js");

const TRACK_BASE_URL =
  process.env.TRACK_BASE_URL || "fetandelivery.netlify.app/track";
// process.env.TRACK_BASE_URL || "http://localhost:5173/track";

// Helper: calculate price for an item
function calcUnitPrice(item) {
  // Sambusa Pricing
  if (item.foodType === "sambusa") {
    return 30; // fixed sambusa price
  }

  // Ertib Pricing
  let base = item.ertibType === "special" ? 135 : 110;
  if (item.extraKetchup) base += 10;
  if (item.doubleFelafil) base += 15;
  return base;
}

// Helper: generate unique tracking code
function generateTrackingCode() {
  const prefix = "FD";
  const random = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${random}`;
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
        Felafil: !!i.Felafil,
        ketchup: !!i.ketchup,
        spices: !!i.spices,
        extraKetchup: !!i.extraKetchup,
        doubleFelafil: !!i.doubleFelafil,
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
    const limit = parseInt(req.query.limit || "100");
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

router.post(
  "/",
  getUserIdMiddleware,
  checkServiceAvailability,
  async (req, res) => {
    try {
      const { customerName, phone, location, items } = req.body;

      if (
        !customerName ||
        !phone ||
        !location ||
        !Array.isArray(items) ||
        items.length === 0
      ) {
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
        total += unitPrice * quantity;
        return { ...it, quantity, unitPrice, lineTotal: unitPrice * quantity };
      });

      const trackingCode = generateTrackingCode();
      const trackUrl = `${TRACK_BASE_URL}/${trackingCode}`;

      // Optional userId
      const userId = req.userId; // will be null if guest
      console.log("Authenticated user:", req.userId);

      const authHeader = req.headers.authorization;
      const orderData = {
        customerName,
        phone: normalizedPhone,
        location,
        source: "online",
        items: builtItems,
        smsHistory: [],
        total,
        trackingCode,
        trackUrl,
        statusHistory: [{ status: "pending", at: new Date().toISOString() }],
        userId, // <-- null if guest
      };

      const order = await prisma.order.create({ data: orderData });

      // Send SMS (non-blocking)
      const smsText = `✅ Hi ${customerName}! Your Ertib order is confirmed. Total: ${total} birr. Track here: ${trackUrl}`;
      sendSMS(normalizedPhone, smsText)
        .then((smsResp) =>
          prisma.order.update({
            where: { id: order.id },
            data: {
              smsHistory: [
                ...(order.smsHistory || []),
                {
                  type: "confirmation",
                  status: smsResp.status,
                  providerResponse: smsResp.info,
                  at: new Date().toISOString(),
                },
              ],
            },
          })
        )
        .catch((err) => console.error("❌ SMS failed:", err));

      return res.json({
        message: "Order placed successfully",
        orderId: order.id,
        trackingCode,
        trackUrl,
      });
    } catch (err) {
      console.error("❌ Error creating order:", err);
      return res.status(500).json({ message: "Server error" });
    }
  }
);

/**
 * ------------------------
 *  Create Manual Order (Admin)
 * ------------------------
 */
router.post("/manual", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { customerName, phone, location, items, notes } = req.body;

    if (!customerName || !phone || !location || !items?.length) {
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

      return { ...it, quantity, unitPrice, lineTotal };
    });

    const trackingCode = generateTrackingCode();
    const trackUrl = `${TRACK_BASE_URL}/${trackingCode}`;

    const order = await prisma.order.create({
      data: {
        customerName,
        phone: normalizedPhone,
        location,
        source: "manual",
        items: builtItems,
        smsHistory: [],
        total,
        trackingCode,
        trackUrl,
        notes,
        statusHistory: [{ status: "pending", at: new Date().toISOString() }],
        userId: req.user?.id || null, // optional
      },
    });

    // Optional SMS
    const smsText = `✅ Hi ${customerName}! Your Ertib order is confirmed. Total: ${total} birr. Track here: ${trackUrl}`;

    sendSMS(normalizedPhone, smsText)
      .then((smsResp) =>
        prisma.order.update({
          where: { id: order.id },
          data: {
            smsHistory: [
              ...(order.smsHistory || []),
              {
                type: "confirmation",
                status: smsResp.status,
                providerResponse: smsResp.info,
                at: new Date().toISOString(),
              },
            ],
          },
        })
      )
      .catch((err) => console.error("❌ SMS failed:", err));

    return res.status(201).json({
      message: "Manual order created",
      order,
    });
  } catch (err) {
    console.error("❌ Manual order error:", err);
    return res.status(500).json({ message: "Server error" });
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

    // push to statusHistory
    const newStatusEntry = { status, at: new Date().toISOString() };
    const updatedHistory = [...(order.statusHistory || []), newStatusEntry];

    // optional: send arrival SMS
    if (status === "arrived") {
      const text = `📍 Hi ${order.customerName}, your Ertib has arrived. Please come and take it. Track: ${order.trackUrl}`;
      sendSMS(order.phone, text)
        .then((smsResp) =>
          prisma.order
            .update({
              where: { id: parseInt(id) },
              data: {
                smsHistory: [
                  ...(order.smsHistory || []),
                  {
                    type: "arrival",
                    providerResponse: smsResp.info,
                    status: smsResp.status,
                    at: new Date().toISOString(),
                  },
                ],
              },
            })
            .catch((err) =>
              console.error("❌ Failed to update SMS history:", err)
            )
        )
        .catch((err) => console.error("❌ SMS send error:", err));
    }

    await prisma.order.update({
      where: { id: parseInt(id) },
      data: {
        status,
        statusHistory: updatedHistory,
      },
    });

    res.json({ message: "Status updated", orderId: order.id });
  } catch (err) {
    console.error("❌ Error updating status:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * ------------------------
 *  Track Order by Tracking Code
 * ------------------------
 */
router.get("/track/:code", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // start of today
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1); // start of tomorrow

    const order = await prisma.order.findFirst({
      where: {
        trackingCode: req.params.code,
        createdAt: {
          gte: today,
          lt: tomorrow, // only today's orders
        },
      },
    });

    if (!order)
      return res
        .status(404)
        .json({ message: "No order found for today with this tracking code" });

    res.json({
      id: order.id,
      trackingCode: order.trackingCode,
      trackUrl: order.trackUrl,
      status: order.status,
      statusHistory: order.statusHistory || [],
      customerName: order.customerName,
      phone: order.phone,
      location: order.location,
      createdAt: order.createdAt,
      total: order.total,
      items: order.items || [],
      source: order.source,
    });
  } catch (err) {
    console.error("❌ Tracking error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * Update order by tracking code (guest or authenticated)
 * Only allowed before 15:00 server local time
 */
router.put("/track/:code", checkServiceAvailability, async (req, res) => {
  try {
    const code = req.params.code;
    let { customerName, phone, location, items, total } = req.body;

    // FIX: use findFirst instead of findUnique
    const order = await prisma.order.findFirst({
      where: { trackingCode: code },
    });

    if (!order) return res.status(404).json({ message: "Order not found" });

    // Auto recalc total
    const computedTotal =
      items && Array.isArray(items)
        ? items.reduce((sum, item) => sum + (item.lineTotal || 0), 0)
        : order.total;

    const updated = await prisma.order.update({
      where: { id: order.id }, // id is unique
      data: {
        customerName: customerName ?? order.customerName,
        phone: phone ?? order.phone,
        location: location ?? order.location,
        items: items ?? order.items,
        total: total ? Number(total) : computedTotal,
      },
    });

    res.json({ message: "Order updated", order: updated });
  } catch (err) {
    console.error("❌ Error updating order:", err);
    res.status(500).json({ message: "Server error updating order" });
  }
});


/**
 * Delete order by tracking code (guest or authenticated)
 * Only allowed before 17:30 server local time
 */
router.delete("/track/:code", checkServiceAvailability, async (req, res) => {
  try {
    const code = req.params.code;

    const order = await prisma.order.findFirst({
      where: { trackingCode: code },
    });

    if (!order) return res.status(404).json({ message: "Order not found" });

    await prisma.order.delete({
      where: { id: order.id },
    });

    res.json({ message: "Order deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting order by tracking code:", err);
    res.status(500).json({ message: "Server error while deleting order" });
  }
});

router.get("/latest", authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const twelvyHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000); // 12 hours ago

    // Fetch latest order in the last 12 hours for the logged-in user
    const latestOrder = await prisma.order.findFirst({
      where: {
        userId: req.user.id,
        createdAt: {
          gte: twelvyHoursAgo, // orders from 12 hours ago until now
          lt: now,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(latestOrder || null);
  } catch (err) {
    console.error("❌ Error fetching latest order:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get(
  "/manual-orders",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const date = req.query.date;
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ message: "Invalid or missing date" });
      }

      // Compute start and end of the day
      const start = new Date(date + "T00:00:00Z");
      const end = new Date(date + "T23:59:59Z");

      const manualOrders = await prisma.order.findMany({
        where: {
          source: "manual",
          createdAt: { gte: start, lt: end }, // filter by date
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          trackingCode: true,
          customerName: true,
          phone: true,
          location: true,
          trackUrl: true,
          createdAt: true,
          items: true,
          total: true,
          status: true,
        },
      });

      res.json(manualOrders);
    } catch (error) {
      console.error("Error fetching manual orders:", error);
      res.status(500).json({ message: "Failed to load manual orders." });
    }
  }
);

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
        text = `✅ Hi ${order.customerName}! Your Ertib order is confirmed. Total: ${order.total} birr. Track: ${order.trackUrl}`;
      else if (type === "arrival")
        text = `📍 Hi ${order.customerName}, your Ertib has arrived. Please come and take it. Track: ${order.trackUrl}`;
      else return res.status(400).json({ message: "Invalid SMS type" });

      sendSMS(order.phone, text)
        .then((smsResp) =>
          prisma.order
            .update({
              where: { id: parseInt(orderId) },
              data: {
                smsHistory: [
                  ...(order.smsHistory || []),
                  {
                    type,
                    providerResponse: smsResp.info,
                    status: smsResp.status,
                    at: new Date().toISOString(),
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

/**
 * ---------------------------------------------------------
 *  BULK SMS SYSTEM
 * ---------------------------------------------------------
 */
router.post("/bulk-sms", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message)
      return res.status(400).json({ message: "Message text is required" });

    const orderPhones = await prisma.order.findMany({
      select: { phone: true },
    });
    const userPhones = await prisma.user.findMany({ select: { phone: true } });

    let allNumbers = [
      ...orderPhones.map((o) => o.phone),
      ...userPhones.map((u) => u.phone),
    ];

    let uniqueNumbers = [...new Set(allNumbers)];

    // Exclude your number — not part of promo
    uniqueNumbers = uniqueNumbers.filter((n) => n !== "0954724664");

    if (!uniqueNumbers.length)
      return res.status(404).json({ message: "No phone numbers available" });

    console.log("📤 Sending bulk SMS to:", uniqueNumbers.length);

    // 2. Retry function (3 attempts)
    const sendWithRetry = async (phone, message) => {
      let attempts = 0;
      while (attempts < 3) {
        try {
          attempts++;
          const res = await sendSMS(phone, message);
          return { phone, status: "sent", attempts, info: res.info };
        } catch (err) {
          if (attempts >= 3) {
            return { phone, status: "failed", attempts, error: err.message };
          }
        }
      }
    };

    // 3. Parallel sending (fast)
    const firstResults = await Promise.all(
      uniqueNumbers.map((phone) => sendWithRetry(phone, message))
    );

    const failedNumbers = firstResults
      .filter((r) => r.status === "failed")
      .map((r) => r.phone);

    console.log("⏳ Scheduled retry for:", failedNumbers.length, "numbers");

    // 4. Auto Retry After 10 Minutes
    setTimeout(async () => {
      console.log("🔁 Retrying failed numbers after 10 minutes...");

      const retry2 = async (phone) => {
        let attempts = 0;
        while (attempts < 2) {
          try {
            attempts++;
            const res = await sendSMS(phone, message);
            return {
              phone,
              status: "sent",
              retryCycle: "10-minute",
              attempts,
              info: res.info,
            };
          } catch (err) {
            if (attempts >= 2) {
              return {
                phone,
                status: "failed",
                retryCycle: "10-minute",
                attempts,
                error: err.message,
              };
            }
          }
        }
      };

      if (failedNumbers.length > 0) {
        const secondResults = await Promise.all(
          failedNumbers.map((phone) => retry2(phone))
        );
        console.log("🔁 Retry Results:", secondResults);
      }
    }, 10 * 60 * 1000);

    // 5. Response to frontend immediately
    const sent = firstResults.filter((r) => r.status === "sent").length;
    const failed = firstResults.filter((r) => r.status === "failed").length;

    res.json({
      success: true,
      totalNumbers: uniqueNumbers.length,
      sentFirstRound: sent,
      failedFirstRound: failed,
      autoRetryScheduled: true,
      retryAfterMinutes: 10,
    });
  } catch (err) {
    console.error("❌ Bulk SMS error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
