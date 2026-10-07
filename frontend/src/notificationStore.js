export const STORAGE_KEY = "fcm_notifications_history";
export const NOTIFICATIONS_UPDATED_EVENT = "notifications_updated";
const MAX_NOTIFICATIONS = 25;

export function getStoredNotifications() {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
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

    // Prevent duplicate entries by id or identical title + message
    if (
      list.some(
        (n) =>
          n.id === newEntry.id ||
          (n.title === newEntry.title &&
            n.message === newEntry.message &&
            Math.abs(new Date(n.timestamp) - new Date(newEntry.timestamp)) < 4000)
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
