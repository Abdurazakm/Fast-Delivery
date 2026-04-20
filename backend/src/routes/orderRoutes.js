const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");
const { normalizePhone, isValidPhone } = require("../utils/phone");
const checkServiceAvailability = require("../middlewares/serviceAvailability");
const { sendSMS } = require("../services/smsService");
const {
  authMiddleware,
  adminMiddleware,
  adminOrEmployMiddleware,
  adminEmploySupleyerReadMiddleware,
} = require("../middlewares/authMiddleware");

const {
  getUserIdMiddleware,
} = require("../middlewares/getUserIdMiddleware.js");
const { calcUnitPrice, getActivePricing } = require("../config/pricing");
const {
  emitOrderUpdated,
  emitOrderDeleted,
  emitGlobalNotification,
  emitAdminNotification,
  getSocket,
} = require("../socket");

const TRACK_BASE_URL =
  process.env.TRACK_BASE_URL || "fetandelivery.netlify.app/track";
  // process.env.TRACK_BASE_URL || "http://localhost:5173/track";

function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    req.user = null;
  }

  return next();
}

function checkServiceAvailabilityForNonAdmin(req, res, next) {
  if (req.user?.role === "admin") {
    return next();
  }

  return checkServiceAvailability(req, res, next);
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
        foodType: i.foodType || "ertib",
        ertibType: i.ertibType,
        extraEggs: Number(i.extraEggs) || 0,
        donutPairsPerPackage: Number(i.donutPairsPerPackage) || 0,
        Felafil: !!i.Felafil,
        ketchup: !!i.ketchup,
        spices: !!i.spices,
        extraKetchup: !!i.extraKetchup,
        doubleFelafil: !!i.doubleFelafil,
        quantity: i.quantity || 1,
      })),
    );

  return recentOrders.some((o) => formatItems(o.items) === formatItems(items));
}

async function findRecentActiveOrderByPhone(phone) {
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
  return prisma.order.findFirst({
    where: {
      phone,
      createdAt: { gte: twelveHoursAgo },
      status: { notIn: ["delivered", "canceled", "no_show"] },
    },
    orderBy: { createdAt: "desc" },
  });
}

router.get("/pricing", async (req, res) => {
  try {
    const pricing = await getActivePricing(prisma);
    res.json(pricing);
  } catch (err) {
    console.error("❌ Error loading pricing:", err);
    res.status(500).json({ message: "Failed to load pricing" });
  }
});

/**
 * ------------------------
 *  List Orders (Admin) with Date Filter
 * ------------------------
 */
router.get(
  "/",
  authMiddleware,
  adminEmploySupleyerReadMiddleware,
  async (req, res) => {
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
  },
);

router.post(
  "/",
  getUserIdMiddleware,
  checkServiceAvailability,
  async (req, res) => {
    try {
      const { customerName, phone, location, items, forceCreateDuplicate } =
        req.body;
      const pricing = await getActivePricing(prisma);

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

      // Prevent accidental double orders: suggest editing a recent active order.
      const existingRecentOrder =
        await findRecentActiveOrderByPhone(normalizedPhone);
      const isAdminRequester =
        String(req.userRole || "").toLowerCase() === "admin";
      const canOverrideDuplicate = !!forceCreateDuplicate && isAdminRequester;

      if (existingRecentOrder && !canOverrideDuplicate) {
        return res.status(409).json({
          message:
            "You already have a recent active order with this phone number. Please edit the previous order instead of creating a new one.",
          code: "EXISTING_PHONE_ORDER",
          existingOrder: {
            trackingCode: existingRecentOrder.trackingCode,
            status: existingRecentOrder.status,
            paymentStatus: existingRecentOrder.paymentStatus || "unpaid",
            createdAt: existingRecentOrder.createdAt,
            trackUrl:
              existingRecentOrder.trackUrl ||
              `${TRACK_BASE_URL}/${existingRecentOrder.trackingCode}`,
            editUrl: `/order?edit=${existingRecentOrder.trackingCode}`,
          },
        });
      }

      let total = 0;
      const builtItems = items.map((it) => {
        const unitPrice = calcUnitPrice(it, pricing);
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
      emitOrderUpdated(order, "created");
      emitAdminNotification({
        type: "new-order",
        title: "New Order Received",
        message: `${order.customerName} placed order ${order.trackingCode}.`,
        trackingCode: order.trackingCode,
        url: `/track/${order.trackingCode}`,
      });

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
          }),
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
  },
);

/**
 * ------------------------
 *  Create Manual Order (Admin)
 * ------------------------
 */
router.post("/manual", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      customerName,
      phone,
      location,
      items,
      notes,
      forceCreateDuplicate,
    } = req.body;
    const pricing = await getActivePricing(prisma);

    if (!customerName || !phone || !location || !items?.length) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const normalizedPhone = normalizePhone(phone);
    if (!isValidPhone(normalizedPhone)) {
      return res.status(400).json({ message: "Invalid phone number" });
    }

    const existingRecentOrder =
      await findRecentActiveOrderByPhone(normalizedPhone);
    if (existingRecentOrder && !forceCreateDuplicate) {
      return res.status(409).json({
        message:
          "A recent active order already exists for this phone number. Edit the previous order, or continue anyway as admin.",
        code: "EXISTING_PHONE_ORDER",
        existingOrder: {
          trackingCode: existingRecentOrder.trackingCode,
          status: existingRecentOrder.status,
          paymentStatus: existingRecentOrder.paymentStatus || "unpaid",
          createdAt: existingRecentOrder.createdAt,
          trackUrl:
            existingRecentOrder.trackUrl ||
            `${TRACK_BASE_URL}/${existingRecentOrder.trackingCode}`,
          editUrl: `/order?edit=${existingRecentOrder.trackingCode}`,
        },
      });
    }

    let total = 0;
    const builtItems = items.map((it) => {
      const unitPrice = calcUnitPrice(it, pricing);
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
    emitOrderUpdated(order, "created");

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
        }),
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
router.put(
  "/:id/status",
  authMiddleware,
  adminOrEmployMiddleware,
  async (req, res) => {
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

      const updatedOrder = await prisma.order.update({
        where: { id: parseInt(id) },
        data: {
          status,
          statusHistory: updatedHistory,
        },
      });

      emitOrderUpdated(updatedOrder, "status");
      emitGlobalNotification({
        type: "status",
        title: "Order Status Updated",
        message: `Order is now ${status.replace("_", " ")}.`,
        trackingCode: updatedOrder.trackingCode,
        url: `/track/${updatedOrder.trackingCode}`,
        status,
      });

      res.json({ message: "Status updated", orderId: order.id });
    } catch (err) {
      console.error("❌ Error updating status:", err);
      res.status(500).json({ message: "Server error" });
    }
  },
);

router.put(
  "/:id/payment-status",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { paymentStatus } = req.body;

      const allowedPaymentStatuses = ["paid", "unpaid"];
      if (!allowedPaymentStatuses.includes(paymentStatus)) {
        return res.status(400).json({ message: "Invalid payment status" });
      }

      const order = await prisma.order.findUnique({
        where: { id: parseInt(id) },
      });
      if (!order) return res.status(404).json({ message: "Order not found" });

      const updatedOrder = await prisma.order.update({
        where: { id: parseInt(id) },
        data: { paymentStatus },
      });

      emitOrderUpdated(updatedOrder, "payment-status");

      res.json({ message: "Payment status updated", orderId: order.id });
    } catch (err) {
      console.error("❌ Error updating payment status:", err);
      res.status(500).json({ message: "Server error" });
    }
  },
);

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
      paymentStatus: order.paymentStatus || "unpaid",
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
 * ------------------------
 *  Get Order For Edit Prefill (by Tracking Code)
 * ------------------------
 */
router.get("/track/:code/edit", async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { trackingCode: req.params.code },
      orderBy: { createdAt: "desc" },
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({
      id: order.id,
      trackingCode: order.trackingCode,
      trackUrl: order.trackUrl,
      status: order.status,
      paymentStatus: order.paymentStatus || "unpaid",
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
    console.error("❌ Edit prefill load error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * Update order by tracking code (guest or authenticated)
 * Admin can edit any time, guests follow service availability rules
 */
router.put(
  "/track/:code",
  optionalAuthMiddleware,
  checkServiceAvailabilityForNonAdmin,
  async (req, res) => {
    try {
      const code = req.params.code;
      let { customerName, phone, location, items } = req.body;
      const pricing = await getActivePricing(prisma);

      // FIX: use findFirst instead of findUnique
      const order = await prisma.order.findFirst({
        where: { trackingCode: code },
      });

      if (!order) return res.status(404).json({ message: "Order not found" });

      let computedTotal = order.total;
      let builtItems = order.items;

      if (items && Array.isArray(items)) {
        computedTotal = 0;
        builtItems = items.map((it) => {
          const unitPrice = calcUnitPrice(it, pricing);
          const quantity = parseInt(it.quantity) || 1;
          const lineTotal = unitPrice * quantity;
          computedTotal += lineTotal;
          return { ...it, quantity, unitPrice, lineTotal };
        });
      }

      const updated = await prisma.order.update({
        where: { id: order.id }, // id is unique
        data: {
          customerName: customerName ?? order.customerName,
          phone: phone ?? order.phone,
          location: location ?? order.location,
          items: builtItems,
          total: computedTotal,
        },
      });

      emitOrderUpdated(updated, "updated");

      res.json({ message: "Order updated", order: updated });
    } catch (err) {
      console.error("❌ Error updating order:", err);
      res.status(500).json({ message: "Server error updating order" });
    }
  },
);

/**
 * Delete order by tracking code (guest or authenticated)
 * Admin can cancel any time, guests follow service availability rules
 */
router.delete(
  "/track/:code",
  optionalAuthMiddleware,
  checkServiceAvailabilityForNonAdmin,
  async (req, res) => {
    try {
      const code = req.params.code;

      const order = await prisma.order.findFirst({
        where: { trackingCode: code },
      });

      if (!order) return res.status(404).json({ message: "Order not found" });

      await prisma.order.delete({
        where: { id: order.id },
      });

      emitOrderDeleted(order);

      res.json({ message: "Order deleted successfully" });
    } catch (err) {
      console.error("❌ Error deleting order by tracking code:", err);
      res.status(500).json({ message: "Server error while deleting order" });
    }
  },
);

router.get("/latest", authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const twelvyHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000); // 12 hours ago

    // Fetch all orders in the last 12 hours for the logged-in user
    const latestOrders = await prisma.order.findMany({
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

    res.json(latestOrders || []);
  } catch (err) {
    console.error("❌ Error fetching latest order:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get(
  "/manual-orders",
  authMiddleware,
  adminEmploySupleyerReadMiddleware,
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
          paymentStatus: true,
        },
      });

      res.json(manualOrders);
    } catch (error) {
      console.error("Error fetching manual orders:", error);
      res.status(500).json({ message: "Failed to load manual orders." });
    }
  },
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
              console.error("❌ Failed to update SMS history:", err),
            ),
        )
        .catch((err) => console.error("❌ SMS send error:", err));

      res.json({ message: "SMS resend triggered" });
    } catch (err) {
      console.error("❌ Error resending SMS:", err);
      res.status(500).json({ message: "Server error" });
    }
  },
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
    emitOrderDeleted(order);
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

    const io = getSocket();
    const connectedUsers = io?.engine?.clientsCount || 0;

    emitGlobalNotification({
      type: "announcement",
      title: "New Announcement",
      message,
    });

    res.json({
      success: true,
      channel: "socket-notification",
      deliveredToConnectedClients: connectedUsers,
      message: "Announcement broadcasted to connected users.",
    });
  } catch (err) {
    console.error("❌ Bulk SMS error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
