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
  normalizeItemAvailability,
  getUnavailableFoodTypes,
  formatFoodTypeLabel,
  parseAvailabilityMetadata,
} = require("../config/itemAvailability");
const {
  emitOrderUpdated,
  emitOrderDeleted,
  emitGlobalNotification,
  emitAdminNotification,
  emitTargetedOrderNotification,
  getSocket,
} = require("../socket");
const { sendNotificationForOrder, sendNotificationToUser } = require("../services/pushNotificationService");
const { maskTrackingCode } = require("../utils/masking");
const fs = require("fs");
const path = require("path");
const { parseReceiptText } = require("../utils/receiptParser");
const {
  uploadReceipt,
  getUploadedFileUrl,
  deleteUploadedFile,
} = require("../utils/cloudinary");

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

async function getCurrentItemAvailability() {
  const availability = await prisma.availability.findFirst();
  const { itemAvailability } = parseAvailabilityMetadata(
    availability?.tempCloseReason,
  );
  return normalizeItemAvailability(itemAvailability);
}

function buildUnavailableItemsResponse(unavailableFoodTypes = []) {
  const itemLabels = unavailableFoodTypes.map((foodType) =>
    formatFoodTypeLabel(foodType),
  );

  return {
    message: `These items are currently unavailable: ${itemLabels.join(", ")}. Please update your order items.`,
    code: "ITEM_UNAVAILABLE",
    unavailableItems: unavailableFoodTypes,
  };
}

router.get("/pricing", async (req, res) => {
  try {
    res.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
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

      const currentItemAvailability = await getCurrentItemAvailability();
      const unavailableFoodTypes = getUnavailableFoodTypes(
        items,
        currentItemAvailability,
      );
      if (unavailableFoodTypes.length) {
        return res
          .status(400)
          .json(buildUnavailableItemsResponse(unavailableFoodTypes));
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
      const paymentMethod = req.body.paymentMethod === "cod" ? "cod" : "online";
      const changeRequested = req.body.changeRequested
        ? String(req.body.changeRequested).trim()
        : "exact";
      const paymentStatus = paymentMethod === "cod" ? "pending_cash" : "unpaid";

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
        paymentMethod,
        changeRequested,
        paymentStatus,
      };

      const order = await prisma.order.create({ data: orderData });

      const { fcmToken } = req.body || {};
      if (fcmToken && typeof fcmToken === "string") {
        await prisma.deviceToken
          .upsert({
            where: { token: fcmToken },
            update: {
              userId: userId || undefined,
              phone: normalizedPhone,
            },
            create: {
              token: fcmToken,
              userId: userId || null,
              phone: normalizedPhone,
            },
          })
          .catch((err) => console.warn("Failed to link FCM token:", err?.message));
      }
      const maskedCode = maskTrackingCode(order.trackingCode);
      emitOrderUpdated(order, "created");
      emitAdminNotification({
        type: "new-order",
        title: "New Order Received",
        message: `${order.customerName} placed order (${maskedCode}).`,
        trackingCode: order.trackingCode,
        url: `/track/${order.trackingCode}`,
      });

      // Send notification directly to customer device(s)
      if (order.paymentMethod === "online") {
        sendNotificationForOrder(order, {
          title: `💳 Complete Payment for Order (${maskedCode})`,
          body: `Hi ${customerName}, please complete your transfer of ${total} Birr via Telebirr or CBE and upload your receipt screenshot.`,
          url: `/track/${order.trackingCode}#payment-card`,
          data: {
            orderId: order.id,
            trackingCode: order.trackingCode,
            type: "payment",
            url: `/track/${order.trackingCode}#payment-card`,
          },
        }).catch((err) => console.error("❌ Order payment push failed:", err?.message));

        emitTargetedOrderNotification(order, {
          title: "💳 Complete Your Payment",
          message: `Please complete transfer of ${total} Birr via Telebirr or CBE and upload receipt to begin preparation.`,
          trackingCode: order.trackingCode,
          url: `/track/${order.trackingCode}#payment-card`,
          type: "payment",
        });
      } else {
        sendNotificationForOrder(order, {
          title: `Order (${maskedCode}) Confirmed 🎉`,
          body: `Hi ${customerName}, your order (${maskedCode}) is confirmed. Total: ${total} Birr (Pay on delivery).`,
          url: `/track/${order.trackingCode}`,
          data: {
            orderId: order.id,
            trackingCode: order.trackingCode,
            type: "status",
            url: `/track/${order.trackingCode}`,
          },
        }).catch((err) => console.error("❌ Order confirmation push failed:", err?.message));

        emitTargetedOrderNotification(order, {
          title: "Order Confirmed 🎉",
          message: `Your order (${maskedCode}) is confirmed. Total: ${total} Birr (Cash on delivery).`,
          trackingCode: order.trackingCode,
          url: `/track/${order.trackingCode}`,
          type: "status",
        });
      }

      // Send SMS (non-blocking)
      const smsText =
        order.paymentMethod === "online"
          ? `💳 Hi ${customerName}! Please complete your transfer of ${total} Birr for Ertib order (${maskedCode}) via Telebirr/CBE & upload receipt: ${trackUrl}#payment-card`
          : `✅ Hi ${customerName}! Your Ertib order is confirmed (Cash on Delivery). Total: ${total} birr. Track here: ${trackUrl}`;
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

    const paymentMethod = req.body.paymentMethod === "cod" ? "cod" : "online";
    const changeRequested = req.body.changeRequested
      ? String(req.body.changeRequested).trim()
      : "exact";
    const paymentStatus =
      paymentMethod === "cod"
        ? "pending_cash"
        : (req.body.paymentStatus || "unpaid");

    // Look up if a registered customer exists with this phone number; never assign admin's userId
    let customerUserId = null;
    const existingCustomerUser = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: normalizedPhone },
          { phone: String(phone).trim() },
          ...(normalizedPhone.startsWith("+251")
            ? [
                { phone: "0" + normalizedPhone.slice(4) },
                { phone: normalizedPhone.slice(4) },
              ]
            : []),
        ],
      },
      select: { id: true },
    });
    if (existingCustomerUser) {
      customerUserId = existingCustomerUser.id;
    }

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
        userId: customerUserId,
        paymentMethod,
        changeRequested,
        paymentStatus,
      },
    });
    emitOrderUpdated(order, "created");

    const maskedCode = maskTrackingCode(order.trackingCode);
    if (order.paymentMethod === "online" && order.paymentStatus !== "paid") {
      sendNotificationForOrder(order, {
        title: `💳 Complete Payment for Order (${maskedCode})`,
        body: `Hi ${customerName}, please complete your transfer of ${total} Birr via Telebirr or CBE and upload receipt to begin preparation.`,
        url: `/track/${order.trackingCode}#payment-card`,
        data: {
          orderId: order.id,
          trackingCode: order.trackingCode,
          type: "payment",
          url: `/track/${order.trackingCode}#payment-card`,
        },
      }).catch((err) => console.error("❌ Manual order payment push failed:", err?.message));

      emitTargetedOrderNotification(order, {
        title: "💳 Complete Your Payment",
        message: `Please complete transfer of ${total} Birr via Telebirr or CBE and upload receipt to begin preparation.`,
        trackingCode: order.trackingCode,
        url: `/track/${order.trackingCode}#payment-card`,
        type: "payment",
      });
    } else {
      sendNotificationForOrder(order, {
        title: `Order (${maskedCode}) Placed 🎉`,
        body: `Hi ${customerName}, your order (${maskedCode}) has been placed. Total: ${total} Birr.`,
        url: `/track/${order.trackingCode}`,
        data: {
          orderId: order.id,
          trackingCode: order.trackingCode,
          type: "status",
          status: order.status || "pending",
          url: `/track/${order.trackingCode}`,
        },
      }).catch((err) => console.error("❌ Manual order confirmation push failed:", err?.message));

      emitTargetedOrderNotification(order, {
        title: `Order (${maskedCode}) Placed 🎉`,
        message: `Your order (${maskedCode}) has been placed. Total: ${total} Birr.`,
        trackingCode: order.trackingCode,
        url: `/track/${order.trackingCode}`,
        type: "status",
        status: order.status || "pending",
      });
    }

    // Optional SMS
    const smsText =
      order.paymentMethod === "online" && order.paymentStatus !== "paid"
        ? `💳 Hi ${customerName}! Please complete your transfer of ${total} Birr for Ertib order (${maskedCode}) via Telebirr/CBE & upload receipt: ${trackUrl}#payment-card`
        : `✅ Hi ${customerName}! Your Ertib order is confirmed. Total: ${total} birr. Track here: ${trackUrl}`;

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
 *  Notification Content Builders
 * ------------------------
 */
function getOrderStatusNotification(status, trackingCode) {
  const maskedCode = maskTrackingCode(trackingCode);
  switch (status) {
    case "pending":
      return {
        title: `Order (${maskedCode}) Received 📋`,
        message: `Your order (${maskedCode}) has been received and queued in the kitchen.`,
      };
    case "in_progress":
      return {
        title: `Cooking Order (${maskedCode}) 🍳`,
        message: `The kitchen is preparing your meal! Your rider will pick it up soon.`,
      };
    case "arrived":
      return {
        title: `Rider Arrived! (${maskedCode}) 🛵`,
        message: `Your rider has arrived at your block! Please meet them to pick up your order.`,
      };
    case "delivered":
      return {
        title: `Order (${maskedCode}) Delivered 🎉`,
        message: `Your order has been delivered successfully. Enjoy your delicious meal!`,
      };
    case "canceled":
      return {
        title: `Order (${maskedCode}) Canceled ❌`,
        message: `Your order (${maskedCode}) has been canceled. Please contact support if you need help.`,
      };
    case "no_show":
      return {
        title: `Rider Waiting for (${maskedCode}) ⚠️`,
        message: `Your rider is waiting at your delivery point but couldn't reach you. Please meet them or call back!`,
      };
    default: {
      const formatted = String(status || "").replace("_", " ");
      return {
        title: `Order (${maskedCode}) Updated 🛵`,
        message: `Your order (${maskedCode}) status is now ${formatted}.`,
      };
    }
  }
}

function getOrderPaymentNotification(paymentStatus, updatedOrder) {
  const maskedCode = maskTrackingCode(updatedOrder.trackingCode);
  const total = updatedOrder.total ?? 0;
  const paid = updatedOrder.amountPaid ?? 0;
  const remaining = Math.max(0, total - paid);

  switch (paymentStatus) {
    case "paid":
      return {
        title: `Payment Confirmed! ✅`,
        message: `Payment for order (${maskedCode}) has been verified and confirmed. Thank you!`,
      };
    case "rejected":
      return {
        title: `Payment Proof Rejected ❌`,
        message: `Payment verification for order (${maskedCode}) could not be confirmed. Please check your transaction details or re-upload proof.`,
      };
    case "partially_paid":
      return {
        title: `Partial Payment Recorded ⚠️`,
        message: `Partial payment of ${paid} ETB received for order (${maskedCode}). Remaining balance is ${remaining} ETB.`,
      };
    case "verifying":
      return {
        title: `Payment Under Review ⏳`,
        message: `Payment proof for order (${maskedCode}) is currently being reviewed by our team.`,
      };
    case "pending_cash":
      return {
        title: `Cash on Delivery Selected 💵`,
        message: `Order (${maskedCode}) will be paid in cash upon delivery (${total} Birr). Please prepare exact change.`,
      };
    case "unpaid":
      return {
        title: `Payment Status: Unpaid ℹ️`,
        message: `Order (${maskedCode}) payment status is marked as unpaid.`,
      };
    default: {
      const formatted = String(paymentStatus || "").replace("_", " ");
      return {
        title: `Payment Status Updated 💳`,
        message: `Payment status for order (${maskedCode}) is now ${formatted}.`,
      };
    }
  }
}

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

      const { title: notificationTitle, message: notificationMessage } =
        getOrderStatusNotification(status, updatedOrder.trackingCode);

      // Send push notification ONLY to the customer device(s) that placed this order
      sendNotificationForOrder(updatedOrder, {
        title: notificationTitle,
        body: notificationMessage,
        url: `/track/${updatedOrder.trackingCode}`,
        data: {
          type: "status",
          status,
          orderId: String(updatedOrder.id),
          trackingCode: updatedOrder.trackingCode,
        },
      }).catch((err) => console.error("❌ Customer push failed:", err?.message));

      // Real-time targeted socket update ONLY to this order's owner and watching screens
      emitTargetedOrderNotification(updatedOrder, {
        type: "status",
        status,
        title: notificationTitle,
        message: notificationMessage,
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
  adminOrEmployMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { paymentStatus, amountPaid } = req.body;

      const allowedPaymentStatuses = [
        "paid",
        "unpaid",
        "partially_paid",
        "verifying",
        "pending_cash",
        "rejected",
      ];
      if (!allowedPaymentStatuses.includes(paymentStatus)) {
        return res.status(400).json({ message: "Invalid payment status" });
      }

      const order = await prisma.order.findUnique({
        where: { id: parseInt(id) },
      });
      if (!order) return res.status(404).json({ message: "Order not found" });

      const updateData = { paymentStatus };
      if (amountPaid !== undefined && !isNaN(Number(amountPaid))) {
        updateData.amountPaid = Math.max(0, Number(amountPaid));
      } else if (paymentStatus === "paid") {
        updateData.amountPaid = order.total;
      } else if (paymentStatus === "unpaid" || paymentStatus === "rejected") {
        updateData.amountPaid = 0;
      }

      const updatedOrder = await prisma.order.update({
        where: { id: parseInt(id) },
        data: updateData,
      });

      emitOrderUpdated(updatedOrder, "payment-status");

      // Notify customer room directly
      const socket = getSocket();
      if (socket) {
        socket.to(`order:${order.trackingCode}`).emit("order:payment-updated", updatedOrder);
      }

      const { title: payTitle, message: payMsg } = getOrderPaymentNotification(
        paymentStatus,
        updatedOrder,
      );

      // Send push notification ONLY to the customer device(s) that placed this order
      sendNotificationForOrder(updatedOrder, {
        title: payTitle,
        body: payMsg,
        url: `/track/${updatedOrder.trackingCode}#payment-card`,
        data: {
          type: "payment-status",
          paymentStatus,
          orderId: String(updatedOrder.id),
          trackingCode: updatedOrder.trackingCode,
        },
      }).catch((err) => console.error("❌ Customer payment push failed:", err?.message));

      // Real-time targeted socket update ONLY to this order's owner and watching screens
      emitTargetedOrderNotification(updatedOrder, {
        type: "payment-status",
        paymentStatus,
        title: payTitle,
        message: payMsg,
      });

      res.json({
        message: "Payment status updated",
        orderId: order.id,
        order: updatedOrder,
      });
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
      paymentMethod: order.paymentMethod || "online",
      changeRequested: order.changeRequested || "exact",
      paymentProofUrl: order.paymentProofUrl || null,
      transactionRef: order.transactionRef || null,
      amountPaid: order.amountPaid ?? 0,
      paymentProofAt: order.paymentProofAt || null,
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
 *  Upload Payment Proof (Receipt Screenshot + Reference)
 * ------------------------
 */
router.post(
  "/track/:code/payment-proof",
  uploadReceipt.single("receiptImage"),
  async (req, res) => {
    try {
      const { code } = req.params;
      const { transactionRef, amountPaid, ocrRawText } = req.body;

      const order = await prisma.order.findFirst({
        where: { trackingCode: code },
      });

      if (!order) {
        if (req.file) {
          await deleteUploadedFile(req.file);
        }
        return res
          .status(404)
          .json({ message: "Order not found for this tracking code" });
      }

      // If user uploaded OCR raw text or ref, parse it
      const parsedOcr = parseReceiptText(ocrRawText || "");
      const normalizedRef = (transactionRef || parsedOcr.reference || "").trim();

      // Check lifetime uniqueness on reference code
      if (normalizedRef) {
        const existingOrderWithRef = await prisma.order.findFirst({
          where: {
            transactionRef: normalizedRef,
            NOT: { id: order.id },
          },
        });

        if (existingOrderWithRef) {
          if (req.file) {
            await deleteUploadedFile(req.file);
          }
          return res.status(409).json({
            message: `This transaction reference (${normalizedRef}) was already used for order (${existingOrderWithRef.trackingCode}). Reused receipts cannot be accepted.`,
            code: "DUPLICATE_TRANSACTION_REF",
          });
        }
      }

      // Determine amount paid
      let resolvedAmountPaid = 0;
      if (amountPaid && !isNaN(Number(amountPaid))) {
        resolvedAmountPaid = Number(amountPaid);
      } else if (parsedOcr.amount) {
        resolvedAmountPaid = parsedOcr.amount;
      }

      const paymentProofUrl = req.file
        ? getUploadedFileUrl(req.file)
        : order.paymentProofUrl;

      // Determine cumulative amount paid and preserve multi-receipt transaction refs
      let newAmountPaid = resolvedAmountPaid || (order.amountPaid ?? 0);
      if (resolvedAmountPaid > 0) {
        if (order.paymentStatus === "partially_paid" && (order.amountPaid || 0) > 0) {
          if (resolvedAmountPaid < order.total) {
            newAmountPaid = (order.amountPaid || 0) + resolvedAmountPaid;
          } else {
            newAmountPaid = resolvedAmountPaid;
          }
        } else {
          newAmountPaid = resolvedAmountPaid;
        }
      }

      let updatedRef = normalizedRef || order.transactionRef;
      if (
        order.paymentStatus === "partially_paid" &&
        order.transactionRef &&
        normalizedRef &&
        !order.transactionRef.includes(normalizedRef)
      ) {
        updatedRef = `${order.transactionRef}, ${normalizedRef}`;
      }

      const updateData = {
        paymentProofUrl,
        transactionRef: updatedRef,
        amountPaid: newAmountPaid,
        paymentProofAt: new Date(),
        paymentStatus: "verifying",
      };

      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: updateData,
      });

      emitOrderUpdated(updatedOrder, "payment-proof");

      const maskedCode = maskTrackingCode(order.trackingCode);
      emitAdminNotification({
        type: "payment-proof",
        title: "Payment Proof Submitted",
        message: `${order.customerName} submitted payment receipt for (${maskedCode}) - ${resolvedAmountPaid ? resolvedAmountPaid + " ETB" : "Verifying"}.`,
        trackingCode: order.trackingCode,
        url: `/track/${order.trackingCode}`,
      });

      const socket = getSocket();
      if (socket) {
        socket.to(`order:${order.trackingCode}`).emit("order:payment-updated", updatedOrder);
      }

      emitTargetedOrderNotification(updatedOrder, {
        type: "payment-status",
        paymentStatus: "verifying",
        title: "Payment Receipt Submitted ⏳",
        message: `Your payment receipt for (${maskedCode}) has been received and is under review.`,
      });

      res.json({
        message: "Payment proof submitted successfully",
        order: updatedOrder,
        parsedOcr,
      });
    } catch (err) {
      console.error("❌ Payment proof upload error:", err);
      if (req.file) {
        try { fs.unlinkSync(req.file.path); } catch {}
      }
      res.status(500).json({
        message: err.message || "Failed to upload payment proof",
      });
    }
  },
);

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
      paymentMethod: order.paymentMethod || "online",
      changeRequested: order.changeRequested || "exact",
      amountPaid: order.amountPaid ?? 0,
      transactionRef: order.transactionRef || null,
      paymentProofUrl: order.paymentProofUrl || null,
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
      let { customerName, phone, location, items, paymentMethod, changeRequested } = req.body;
      const pricing = await getActivePricing(prisma);

      const order = await prisma.order.findFirst({
        where: { trackingCode: code },
      });

      if (!order) return res.status(404).json({ message: "Order not found" });

      let computedTotal = order.total;
      let builtItems = order.items;

      if (items && Array.isArray(items)) {
        if (req.user?.role !== "admin") {
          const currentItemAvailability = await getCurrentItemAvailability();
          const unavailableFoodTypes = getUnavailableFoodTypes(
            items,
            currentItemAvailability,
          );

          if (unavailableFoodTypes.length) {
            return res
              .status(400)
              .json(buildUnavailableItemsResponse(unavailableFoodTypes));
          }
        }

        computedTotal = 0;
        builtItems = items.map((it) => {
          const calculatedPrice = calcUnitPrice(it, pricing);
          const unitPrice =
            calculatedPrice > 0
              ? calculatedPrice
              : (Number(it.unitPrice) || 0);
          const quantity = parseInt(it.quantity) || 1;
          const lineTotal = unitPrice * quantity;
          computedTotal += lineTotal;
          return { ...it, quantity, unitPrice, lineTotal };
        });
      }

      const reqTotal = Number(req.body.total);
      if (computedTotal === 0 && Number.isFinite(reqTotal) && reqTotal > 0) {
        computedTotal = reqTotal;
      }

      // ----------------------------------------------------
      // Smart Payment Reconciliation Logic (Option 1)
      // ----------------------------------------------------
      const alreadyPaidAmount =
        order.amountPaid !== null && order.amountPaid !== undefined && Number(order.amountPaid) > 0
          ? Number(order.amountPaid)
          : order.paymentStatus === "paid"
            ? Number(order.total)
            : 0;

      let nextPaymentStatus = order.paymentStatus || "unpaid";
      let nextAmountPaid = alreadyPaidAmount;
      let editNotice = null;

      const wasAlreadyApprovedOrPartial =
        alreadyPaidAmount > 0 ||
        order.paymentStatus === "paid" ||
        order.paymentStatus === "partially_paid" ||
        order.paymentStatus === "verifying";

      if (wasAlreadyApprovedOrPartial) {
        if (computedTotal > alreadyPaidAmount) {
          // Total INCREASED: shortfall detected
          const shortfall = computedTotal - alreadyPaidAmount;
          nextPaymentStatus = "partially_paid";
          editNotice = {
            type: "shortfall",
            shortfall,
            alreadyPaidAmount,
            computedTotal,
          };

          emitAdminNotification({
            type: "order-edited-shortfall",
            title: "⚠️ Order Edited: Shortfall",
            message: `${order.customerName} edited order (${maskTrackingCode(order.trackingCode)}). Paid: ${alreadyPaidAmount} ETB, New Total: ${computedTotal} ETB. Shortfall: ${shortfall} ETB.`,
            trackingCode: order.trackingCode,
          });
        } else if (computedTotal < alreadyPaidAmount) {
          // Total DECREASED: refund / credit due upon delivery
          const overpayment = alreadyPaidAmount - computedTotal;
          nextPaymentStatus = "paid"; // Remains paid, but flags credit
          editNotice = {
            type: "overpayment",
            overpayment,
            alreadyPaidAmount,
            computedTotal,
          };

          emitAdminNotification({
            type: "order-edited-overpayment",
            title: "💵 Order Edited: Refund Due",
            message: `${order.customerName} edited order (${maskTrackingCode(order.trackingCode)}). Paid: ${alreadyPaidAmount} ETB, New Total: ${computedTotal} ETB. Refund due: ${overpayment} ETB.`,
            trackingCode: order.trackingCode,
          });
        } else {
          // Total unchanged (condiments or room update only)
          nextPaymentStatus = "paid";
        }
      } else if (paymentMethod === "cod" || order.paymentMethod === "cod") {
        nextPaymentStatus = "pending_cash";
      }

      // Append edit audit note to statusHistory
      const currentHistory = Array.isArray(order.statusHistory) ? order.statusHistory : [];
      let updatedHistory = currentHistory;
      if (editNotice) {
        updatedHistory = [
          ...currentHistory,
          {
            type: "order_edited",
            at: new Date().toISOString(),
            note:
              editNotice.type === "shortfall"
                ? `Order edited after payment. New total: ${computedTotal} ETB (Shortfall: ${editNotice.shortfall} ETB unpaid).`
                : `Order edited after payment. New total: ${computedTotal} ETB (Overpayment: ${editNotice.overpayment} ETB refund due).`,
          },
        ];
      }

      const updateData = {
        customerName: customerName ?? order.customerName,
        phone: phone ?? order.phone,
        location: location ?? order.location,
        items: builtItems,
        total: computedTotal,
        paymentStatus: nextPaymentStatus,
        amountPaid: nextAmountPaid,
        statusHistory: updatedHistory,
      };

      if (paymentMethod) {
        updateData.paymentMethod = paymentMethod;
      }
      if (changeRequested) {
        updateData.changeRequested = changeRequested;
      }

      const updated = await prisma.order.update({
        where: { id: order.id },
        data: updateData,
      });

      emitOrderUpdated(updated, "updated");
      emitOrderUpdated(updated, "payment-status");

      // Notify customer room in real time
      const io = getSocket();
      if (io) {
        io.to(`order:${order.trackingCode}`).emit("order:payment-updated", updated);
        io.to(`order:${order.trackingCode}`).emit("order:updated", updated);
      }

      if (editNotice?.type === "shortfall") {
        sendNotificationForOrder(updated, {
          title: "⚠️ Remaining Balance Required",
          body: `Hi ${updated.customerName}, your edited order has a remaining balance of ${editNotice.shortfall} Birr. Please upload proof of payment.`,
          url: `/track/${updated.trackingCode}#payment-card`,
          data: {
            orderId: updated.id,
            trackingCode: updated.trackingCode,
            type: "payment",
            url: `/track/${updated.trackingCode}#payment-card`,
          },
        }).catch((err) => console.error("❌ Shortfall push failed:", err?.message));

        emitTargetedOrderNotification(updated, {
          title: "⚠️ Remaining Balance Required",
          message: `Please complete transfer of ${editNotice.shortfall} Birr and upload receipt to confirm your updated order.`,
          trackingCode: updated.trackingCode,
          url: `/track/${updated.trackingCode}#payment-card`,
          type: "payment",
        });
      }

      res.json({
        message: "Order updated successfully",
        order: updated,
        editNotice,
      });
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

      const maskedCode = maskTrackingCode(order.trackingCode);
      const cancelTitle = `Order (${maskedCode}) Canceled ❌`;
      const cancelMsg = `Your order (${maskedCode}) has been canceled.`;

      sendNotificationForOrder(order, {
        title: cancelTitle,
        body: cancelMsg,
        url: `/track/${order.trackingCode}`,
        data: {
          type: "status",
          status: "canceled",
          orderId: String(order.id),
          trackingCode: order.trackingCode,
        },
      }).catch((err) => console.error("❌ Customer cancellation push failed:", err?.message));

      emitTargetedOrderNotification(order, {
        type: "status",
        status: "canceled",
        title: cancelTitle,
        message: cancelMsg,
      });

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

// ✅ Fetch complete order history for authenticated user
router.get("/my-history", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, phone: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const orders = await prisma.order.findMany({
      where: {
        OR: [{ userId: user.id }, { phone: user.phone }],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    res.json(orders || []);
  } catch (err) {
    console.error("❌ Error fetching my-history:", err);
    res.status(500).json({ message: "Failed to fetch order history." });
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

    const maskedCode = maskTrackingCode(order.trackingCode);
    const cancelTitle = `Order (${maskedCode}) Canceled ❌`;
    const cancelMsg = `Your order (${maskedCode}) has been canceled by staff.`;

    sendNotificationForOrder(order, {
      title: cancelTitle,
      body: cancelMsg,
      url: `/track/${order.trackingCode}`,
      data: {
        type: "status",
        status: "canceled",
        orderId: String(order.id),
        trackingCode: order.trackingCode,
      },
    }).catch((err) => console.error("❌ Admin delete push failed:", err?.message));

    emitTargetedOrderNotification(order, {
      type: "status",
      status: "canceled",
      title: cancelTitle,
      message: cancelMsg,
    });

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
    const { message, title } = req.body;
    if (!message)
      return res.status(400).json({ message: "Message text is required" });

    const io = getSocket();
    const connectedUsers = io?.engine?.clientsCount || 0;
    const notificationTitle = title || "Fetan Delivery Announcement 📢";

    emitGlobalNotification({
      type: "announcement",
      title: notificationTitle,
      message,
      broadcastPush: true,
    });

    res.json({
      success: true,
      channel: "broadcast",
      deliveredToConnectedClients: connectedUsers,
      message: "Announcement broadcasted to connected users and push devices.",
    });
  } catch (err) {
    console.error("❌ Bulk broadcast error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;
