export const STORAGE_KEY = "fcm_notifications_history";
export const NOTIFICATIONS_UPDATED_EVENT = "notifications_updated";
const MAX_NOTIFICATIONS = 25;

/**
 * Mask tracking code (e.g. FD-523814 -> FD-52***4)
 */
export function maskTrackingCode(code) {
  if (!code) return "";
  const s = String(code).trim();
  const match = s.match(/^([A-Za-z]+-)(\d{2})\d{3}(\d+)$/);
  if (match) {
    return `${match[1]}${match[2]}***${match[3]}`;
  }
  if (s.length >= 8) {
    return `${s.slice(0, 5)}***${s.slice(8) || s.slice(-1)}`;
  }
  return s;
}

// In-memory set to prevent duplicate popups and duplicate storage within 10 seconds
const recentSignatures = new Map();

export function isDuplicateNotification(notif) {
  if (!notif) return true;
  const now = Date.now();

  // Clean old signatures (> 15 seconds)
  for (const [key, time] of recentSignatures.entries()) {
    if (now - time > 15000) recentSignatures.delete(key);
  }

  // Build content-based signature so Socket.IO and FCM produce matching keys
  const identifier =
    notif.orderId ||
    notif.data?.orderId ||
    notif.trackingCode ||
    notif.data?.trackingCode ||
    "order";
  const status = notif.status || notif.data?.status || "";
  const title = (notif.title || notif.notification?.title || "").trim();
  const msg = (notif.message || notif.body || notif.notification?.body || "").trim();
  const sig = `${identifier}-${status}-${title}-${msg}`;

  if (recentSignatures.has(sig)) {
    return true; // Already processed recently!
  }

  recentSignatures.set(sig, now);
  return false;
}

export function getStoredNotifications() {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function getUnreadCount() {
  const list = getStoredNotifications();
  return list.filter((n) => !n.read).length;
}

export function saveNotificationToCollection(notif) {
  if (typeof window === "undefined" || !notif) return;
  try {
    const list = getStoredNotifications();
    const newEntry = {
      id: notif.id || `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: notif.title || "Fetan Delivery",
      message: notif.message || notif.body || "",
      url:
        notif.url ||
        notif.data?.url ||
        (notif.trackingCode ? `/track/${notif.trackingCode}` : "/"),
      type: notif.type || notif.data?.type || "status",
      timestamp: notif.at || notif.timestamp || new Date().toISOString(),
      read: false,
    };

    // Prevent duplicate entries by id or identical title + message within recent time
    if (
      list.some(
        (n) =>
          n.id === newEntry.id ||
          (n.title === newEntry.title &&
            n.message === newEntry.message &&
            Math.abs(new Date(n.timestamp) - new Date(newEntry.timestamp)) < 15000)
      )
    ) {
      return;
    }

    const updated = [newEntry, ...list].slice(0, MAX_NOTIFICATIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Notify any mounted components (like NotificationBell on Home page)
    window.dispatchEvent(
      new CustomEvent(NOTIFICATIONS_UPDATED_EVENT, { detail: updated })
    );
  } catch (err) {
    console.warn("Failed to persist notification into collection:", err);
  }
}
