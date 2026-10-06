const { Server } = require("socket.io");
const {
  sendPushNotificationToAll,
  sendNotificationToAdmins,
} = require("./services/pushNotificationService");
const { normalizePhone } = require("./utils/phone");

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    },
  });

  io.on("connection", (socket) => {
    socket.on("join-admin", () => {
      socket.join("admin");
    });

    socket.on("leave-admin", () => {
      socket.leave("admin");
    });

    socket.on("join-order", (trackingCode) => {
      if (!trackingCode) return;
      socket.join(`order:${trackingCode}`);
    });

    socket.on("leave-order", (trackingCode) => {
      if (!trackingCode) return;
      socket.leave(`order:${trackingCode}`);
    });

    socket.on("join-user", (userId) => {
      if (userId) socket.join(`user:${userId}`);
    });

    socket.on("leave-user", (userId) => {
      if (userId) socket.leave(`user:${userId}`);
    });

    socket.on("join-phone", (phone) => {
      if (!phone) return;
      const normalized = normalizePhone(phone);
      if (normalized) socket.join(`phone:${normalized}`);
    });

    socket.on("leave-phone", (phone) => {
      if (!phone) return;
      const normalized = normalizePhone(phone);
      if (normalized) socket.leave(`phone:${normalized}`);
    });
  });

  return io;
}

function getSocket() {
  return io;
}

function toOrderPayload(order) {
  if (!order) return null;

  return {
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
    updatedAt: order.updatedAt,
    total: order.total,
    items: order.items || [],
    source: order.source,
  };
}

function emitOrderUpdated(order, changeType = "upsert") {
  if (!io || !order) return;

  const payload = toOrderPayload(order);
  io.to("admin").emit("admin:orders-changed", {
    type: changeType,
    order: payload,
  });

  if (payload?.trackingCode) {
    io.to(`order:${payload.trackingCode}`).emit("order:updated", payload);
  }
}

function emitOrderDeleted(order) {
  if (!io || !order) return;

  const payload = toOrderPayload(order);

  io.to("admin").emit("admin:orders-changed", {
    type: "delete",
    order: payload,
  });

  if (payload?.trackingCode) {
    io.to(`order:${payload.trackingCode}`).emit("order:deleted", payload);
  }
}

function emitPricingUpdated(pricing) {
  if (!io) return;

  io.emit("pricing:updated", pricing || null);
}

function emitAvailabilityUpdated(availability) {
  if (!io) return;

  io.emit("availability:updated", availability || null);
}

function emitGlobalNotification(notification) {
  if (!io || !notification) return;

  const payload = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    ...notification,
  };

  io.emit("notification:broadcast", payload);

  // Only broadcast push notification to ALL devices if explicitly flagged as an announcement
  if (notification.broadcastPush === true) {
    sendPushNotificationToAll({
      title: payload.title || "Fetan Delivery",
      body: payload.message || "You have a new update.",
      data: payload,
      url: payload.url || "/",
    }).catch((err) => {
      console.error(
        "❌ Push notification broadcast failed:",
        err?.message || err,
      );
    });
  }
}


function emitTargetedOrderNotification(order, notification) {
  if (!io || !order) return;

  const payload = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    orderId: order.id,
    trackingCode: order.trackingCode,
    status: order.status,
    url: `/track/${order.trackingCode}`,
    ...notification,
  };

  // 1. Direct to anyone watching this specific order tracking page
  if (order.trackingCode) {
    io.to(`order:${order.trackingCode}`).emit("order:notification", payload);
  }

  // 2. Direct to customer account room (if user is logged in)
  if (order.userId) {
    io.to(`user:${order.userId}`).emit("order:notification", payload);
  }

  // 3. Direct to customer phone room
  if (order.phone) {
    const norm = normalizePhone(order.phone);
    if (norm) {
      io.to(`phone:${norm}`).emit("order:notification", payload);
    }
  }

  // 4. Direct to admins for their dashboard alerts
  io.to("admin").emit("admin:order-notification", payload);
}

function emitAdminNotification(notification) {
  if (!io || !notification) return;

  const payload = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    ...notification,
  };

  io.to("admin").emit("admin:order-notification", payload);

  sendNotificationToAdmins({
    title: payload.title || "Admin Alert",
    body: payload.message || "New activity detected.",
    data: payload,
    url: payload.url || "/admin",
  }).catch((err) => {
    console.error("❌ Admin push notification failed:", err?.message || err);
  });
}

module.exports = {
  initSocket,
  getSocket,
  emitOrderUpdated,
  emitOrderDeleted,
  emitPricingUpdated,
  emitAvailabilityUpdated,
  emitGlobalNotification,
  emitAdminNotification,
  emitTargetedOrderNotification,
};
