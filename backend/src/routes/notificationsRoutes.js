const express = require("express");
const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");
const { normalizePhone } = require("../utils/phone");
const {
  isPushEnabled,
  sendNotificationToTokens,
  sendPushNotificationToAll,
} = require("../services/pushNotificationService");

const router = express.Router();

function getOptionalUserId(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded?.id ? Number(decoded.id) : null;
  } catch (err) {
    return null;
  }
}

/**
 * Check if push notifications are configured & enabled
 */
router.get("/status", (req, res) => {
  return res.json({ enabled: isPushEnabled() });
});

/**
 * Register or update an FCM device token
 */
router.post("/register-token", async (req, res) => {
  try {
    const { token, phone, trackingCode } = req.body || {};

    if (!token || typeof token !== "string") {
      return res.status(400).json({ message: "Valid device token is required." });
    }

    let userId = getOptionalUserId(req);
    let normalizedPhone = phone ? normalizePhone(phone) : null;

    if (trackingCode) {
      const order = await prisma.order.findFirst({
        where: { trackingCode },
        select: { phone: true, userId: true },
      });
      if (order) {
        if (!normalizedPhone && order.phone) {
          normalizedPhone = normalizePhone(order.phone);
        }
        if (!userId && order.userId) {
          userId = order.userId;
        }
      }
    }

    if (!normalizedPhone && userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { phone: true },
      });
      if (user?.phone) {
        normalizedPhone = normalizePhone(user.phone);
      }
    }

    await prisma.deviceToken.upsert({
      where: { token },
      update: {
        ...(userId ? { userId } : {}),
        ...(normalizedPhone ? { phone: normalizedPhone } : {}),
      },
      create: {
        token,
        userId: userId || null,
        phone: normalizedPhone || null,
      },
    });

    return res.json({ success: true, message: "Token registered successfully." });
  } catch (err) {
    console.error("❌ register-token failed:", err);
    return res.status(500).json({ message: "Failed to register push token." });
  }
});


/**
 * Remove an FCM device token (e.g. on logout or user disabled notifications)
 */
router.post("/unregister-token", async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token) {
      return res.status(400).json({ message: "Token is required." });
    }

    await prisma.deviceToken
      .delete({ where: { token } })
      .catch(() => {});

    return res.json({ success: true });
  } catch (err) {
    console.error("❌ unregister-token failed:", err);
    return res.status(500).json({ message: "Failed to remove push token." });
  }
});

/**
 * Send a test push notification to a specific token or to all devices
 */
router.post("/test", async (req, res) => {
  try {
    const { token, title, body } = req.body || {};

    if (token) {
      const result = await sendNotificationToTokens([token], {
        title: title || "Test Notification 🚀",
        body: body || "Firebase push notifications are working smoothly!",
        url: "/",
      });
      return res.json({ success: true, result });
    }

    const result = await sendPushNotificationToAll({
      title: title || "Broadcast Test 🚀",
      body: body || "Broadcast push notification from Fetan Delivery!",
      url: "/",
    });
    return res.json({ success: true, result });
  } catch (err) {
    console.error("❌ test notification failed:", err);
    return res.status(500).json({ message: "Failed to send test push notification." });
  }
});

module.exports = router;
