export const STORAGE_KEY = "fcm_notifications_history";
export const NOTIFICATIONS_UPDATED_EVENT = "notifications_updated";
export const NOTIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours retention window
const MAX_NOTIFICATIONS = 50;

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

// In-memory set to prevent duplicate popups and duplicate storage within 15 seconds
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

/**
 * Filter out any notifications older than 24 hours
 */
export function pruneExpiredNotifications(list) {
  if (!Array.isArray(list)) return [];
  const now = Date.now();
  return list.filter((n) => {
    if (!n || !n.timestamp) return false;
    const time = new Date(n.timestamp).getTime();
    if (isNaN(time)) return false;
    return now - time < NOTIFICATION_TTL_MS;
  });
}

/**
 * Get stored notifications with automatic 24-hour expiration pruning
 */
export function getStoredNotifications() {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    const valid = pruneExpiredNotifications(parsed);
    // If expired notifications were dropped, persist clean list back to localStorage
    if (valid.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
    }
    return valid;
  } catch {
    return [];
  }
}

/**
 * Get count of unread notifications from active 24-hour pool
 */
export function getUnreadCount() {
  const list = getStoredNotifications();
  return list.filter((n) => !n.read).length;
}

/**
 * Save/replace notification list with automatic 24-hour pruning and event dispatch
 */
export function saveNotificationsList(newList) {
  if (typeof window === "undefined") return [];
  try {
    const pruned = pruneExpiredNotifications(newList).slice(0, MAX_NOTIFICATIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
    window.dispatchEvent(
      new CustomEvent(NOTIFICATIONS_UPDATED_EVENT, { detail: pruned })
    );
    return pruned;
  } catch (err) {
    console.warn("Failed to persist notifications list:", err);
    return [];
  }
}

/**
 * Mark a single notification as read
 */
export function markNotificationAsRead(id) {
  const list = getStoredNotifications();
  const updated = list.map((n) => (n.id === id ? { ...n, read: true } : n));
  return saveNotificationsList(updated);
}

/**
 * Mark all notifications as read
 */
export function markAllNotificationsAsRead() {
  const list = getStoredNotifications();
  const updated = list.map((n) => ({ ...n, read: true }));
  return saveNotificationsList(updated);
}

/**
 * Clear all notifications
 */
export function clearAllNotifications() {
  return saveNotificationsList([]);
}

/**
 * Save newly arrived notification into the collection
 */
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

    const updated = [newEntry, ...list];
    saveNotificationsList(updated);
  } catch (err) {
    console.warn("Failed to persist notification into collection:", err);
  }
}
