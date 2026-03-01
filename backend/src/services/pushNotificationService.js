const webpush = require("web-push");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

let configured = false;

function configureVapid() {
  if (configured) return true;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

  if (!publicKey || !privateKey) {
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

function isPushEnabled() {
  return configureVapid();
}

function getPublicVapidKey() {
  return process.env.VAPID_PUBLIC_KEY || "";
}

async function sendPushNotificationToAll(notification) {
  if (!configureVapid()) {
    return { sent: 0, failed: 0, skipped: true };
  }

  const subscriptions = await prisma.pushSubscription.findMany();
  if (!subscriptions.length) {
    return { sent: 0, failed: 0, skipped: false };
  }

  const payload = JSON.stringify({
    title: notification.title || "Notification",
    message: notification.message || "You have a new update.",
    url: notification.url || "/",
    type: notification.type || "info",
    trackingCode: notification.trackingCode,
    status: notification.status,
    at: notification.at || new Date().toISOString(),
  });

  let sent = 0;
  let failed = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      const subscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(subscription, payload);
        sent += 1;
      } catch (err) {
        failed += 1;

        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await prisma.pushSubscription
            .delete({ where: { endpoint: sub.endpoint } })
            .catch(() => {});
        }
      }
    }),
  );

  return { sent, failed, skipped: false };
}

module.exports = {
  isPushEnabled,
  getPublicVapidKey,
  sendPushNotificationToAll,
};
