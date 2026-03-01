const { Server } = require("socket.io");

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

module.exports = {
  initSocket,
  getSocket,
  emitOrderUpdated,
  emitOrderDeleted,
  emitPricingUpdated,
  emitAvailabilityUpdated,
};
