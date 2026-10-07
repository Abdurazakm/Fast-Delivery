const { messaging } = require("../config/firebase");
const prisma = require("../config/prisma");
const { normalizePhone } = require("../utils/phone");

function isPushEnabled() {
  return !!messaging;
}

/**
 * Send notification to a specific list of FCM tokens
 */
async function sendNotificationToTokens(tokens, { title, body, data = {}, url = "/" }) {
  if (!messaging || !tokens || !tokens.length) {
    return { sent: 0, failed: 0, skipped: true };
  }

  // Filter unique valid strings
  const uniqueTokens = [...new Set(tokens.filter((t) => typeof t === "string" && t.trim()))];
  if (!uniqueTokens.length) {
    return { sent: 0, failed: 0, skipped: true };
  }

  const unifiedTag = data?.orderId
    ? `order-${data.orderId}`
    : data?.trackingCode
      ? `order-${data.trackingCode}`
      : "fetan-update";

  // Data-only payload prevents FCM SDK from auto-displaying a duplicate notification in the background
  const message = {
    data: {
      ...Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)])
      ),
      title: title || "Fetan Delivery",
      body: body || "You have a new update.",
      message: body || "You have a new update.",
      url: url || "/",
      click_action: url || "/",
      tag: unifiedTag,
    },
    webpush: {
      headers: {
        Urgency: "high",
        TTL: "86400", // 24 hours retention for sleeping/inactive devices
      },
      fcmOptions: {
        link: url || "/",
      },
    },
    tokens: uniqueTokens,
  };

  try {
    const response = await messaging.sendEachForMulticast(message);

    // Identify stale/unregistered tokens for automatic database cleanup
    const tokensToRemove = [];
    response.responses.forEach((res, idx) => {
      if (!res.success) {
        const code = res.error?.code;
        if (
          code === "messaging/invalid-registration-token" ||
          code === "messaging/registration-token-not-registered"
        ) {
          tokensToRemove.push(uniqueTokens[idx]);
        }
      }
    });

    if (tokensToRemove.length) {
      await prisma.deviceToken
        .deleteMany({
          where: { token: { in: tokensToRemove } },
        })
        .catch((err) => console.warn("Failed to prune invalid FCM tokens:", err?.message));
    }

    return {
      sent: response.successCount,
      failed: response.failureCount,
      skipped: false,
    };
  } catch (error) {
    console.error("❌ FCM sendEachForMulticast error:", error);
    return { sent: 0, failed: uniqueTokens.length, error: error.message };
  }
}

/**
 * Send notification to a specific user by userId
 */
async function sendNotificationToUser(userId, notification) {
  if (!userId) return { sent: 0, failed: 0, skipped: true };

  try {
    const devices = await prisma.deviceToken.findMany({
      where: { userId: Number(userId) },
      select: { token: true },
    });

    if (!devices.length) return { sent: 0, failed: 0, skipped: false };
    const tokens = devices.map((d) => d.token);
    return await sendNotificationToTokens(tokens, notification);
  } catch (err) {
    console.error("❌ sendNotificationToUser error:", err);
    return { sent: 0, failed: 0, error: err.message };
  }
}

/**
 * Send notification to all admin users
 */
async function sendNotificationToAdmins(notification) {
  try {
    const adminUsers = await prisma.user.findMany({
      where: { role: "admin" },
      select: { id: true },
    });

    if (!adminUsers.length) return { sent: 0, failed: 0, skipped: true };

    const adminIds = adminUsers.map((u) => u.id);
    const devices = await prisma.deviceToken.findMany({
      where: { userId: { in: adminIds } },
      select: { token: true },
    });

    if (!devices.length) return { sent: 0, failed: 0, skipped: false };
    const tokens = devices.map((d) => d.token);
    return await sendNotificationToTokens(tokens, notification);
  } catch (err) {
    console.error("❌ sendNotificationToAdmins error:", err);
    return { sent: 0, failed: 0, error: err.message };
  }
}

/**
 * Broadcast notification to all registered devices
 */
async function sendPushNotificationToAll(notification) {
  try {
    const devices = await prisma.deviceToken.findMany({
      select: { token: true },
    });

    if (!devices.length) return { sent: 0, failed: 0, skipped: false };
    const tokens = devices.map((d) => d.token);
    return await sendNotificationToTokens(tokens, notification);
  } catch (err) {
    console.error("❌ sendPushNotificationToAll error:", err);
    return { sent: 0, failed: 0, error: err.message };
  }
}

/**
 * Send notification ONLY to the customer device(s) that placed this specific order
 */
async function sendNotificationForOrder(order, { title, body, data = {}, url }) {

  if (!order) return { sent: 0, failed: 0, skipped: true };

  try {
    const whereConditions = [];

    if (order.userId) {
      whereConditions.push({ userId: Number(order.userId) });
    }

    if (order.phone) {
      const rawPhone = String(order.phone).trim();
      whereConditions.push({ phone: rawPhone });
      const norm = normalizePhone(rawPhone);
      if (norm) {
        whereConditions.push({ phone: norm });
        if (norm.startsWith("+251")) {
          whereConditions.push({ phone: "0" + norm.slice(4) });
          whereConditions.push({ phone: norm.slice(4) });
        }
      }
    }

    if (!whereConditions.length) {
      return { sent: 0, failed: 0, skipped: true };
    }

    const devices = await prisma.deviceToken.findMany({
      where: { OR: whereConditions },
      select: { token: true },
    });

    if (!devices.length) {
      console.log(`ℹ️ [Push] No FCM tokens linked to order #${order.id} (phone: ${order.phone}, user: ${order.userId})`);
      return { sent: 0, failed: 0, skipped: false };
    }
    const tokens = devices.map((d) => d.token);

    return await sendNotificationToTokens(tokens, {
      title,
      body,
      data: {
        ...data,
        type: "order-status",
        orderId: String(order.id),
        trackingCode: order.trackingCode,
        status: order.status,
      },
      url: url || `/track/${order.trackingCode}`,
    });
  } catch (err) {
    console.error("❌ sendNotificationForOrder error:", err);
    return { sent: 0, failed: 0, error: err.message };
  }
}

module.exports = {
  isPushEnabled,
  sendNotificationToTokens,
  sendNotificationToUser,
  sendNotificationForOrder,
  sendNotificationToAdmins,
  sendPushNotificationToAll,
};

