const express = require("express");
const jwt = require("jsonwebtoken");
const {
  isPushEnabled,
  getPublicVapidKey,
} = require("../services/pushNotificationService");

const router = express.Router();
const prisma = require("../config/prisma");

function getOptionalUserId(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded?.id || null;
  } catch (err) {
    return null;
  }
}

router.get("/public-key", async (req, res) => {
  const publicKey = getPublicVapidKey();
  const enabled = isPushEnabled();

  if (!enabled || !publicKey) {
    return res.status(503).json({
      enabled: false,
      message: "Push notifications are not configured on the server.",
    });
  }

  return res.json({ enabled: true, publicKey });
});

router.post("/subscribe", async (req, res) => {
  try {
    const { subscription } = req.body || {};

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return res.status(400).json({ message: "Invalid push subscription payload." });
    }

    const userId = getOptionalUserId(req);

    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userId,
      },
      create: {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userId,
      },
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("❌ subscribe push failed:", err);
    return res.status(500).json({ message: "Failed to save push subscription." });
  }
});

router.post("/unsubscribe", async (req, res) => {
  try {
    const { endpoint } = req.body || {};
    if (!endpoint) {
      return res.status(400).json({ message: "Endpoint is required." });
    }

    await prisma.pushSubscription.delete({ where: { endpoint } }).catch(() => {});
    return res.json({ success: true });
  } catch (err) {
    console.error("❌ unsubscribe push failed:", err);
    return res.status(500).json({ message: "Failed to remove push subscription." });
  }
});

module.exports = router;
