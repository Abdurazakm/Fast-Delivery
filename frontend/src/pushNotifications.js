import API from "./api";
import { requestFirebaseToken } from "./firebase";

export async function initPushNotifications() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("Notification" in window)) {
    return { enabled: false, reason: "unsupported" };
  }

  try {
    const { token, error } = await requestFirebaseToken();

    if (!token) {
      return { enabled: false, reason: error || "permission-denied" };
    }

    // Save token to backend database with known phone or tracking code
    const phone = localStorage.getItem("last_order_phone") || undefined;
    const trackingCode = localStorage.getItem("last_order_tracking") || undefined;
    await API.post("/notifications/register-token", {
      token,
      ...(phone ? { phone } : {}),
      ...(trackingCode ? { trackingCode } : {}),
    });

    localStorage.setItem("fcm_token", token);
    return { enabled: true, token };
  } catch (err) {
    console.error("Failed to enable push notifications:", err);
    return { enabled: false, reason: "init-failed", error: err };
  }
}

export async function getPushNotificationStatus() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return { supported: false, permission: "unsupported", subscribed: false };
  }

  const token = localStorage.getItem("fcm_token");
  const permission = Notification.permission;

  return {
    supported: true,
    permission,
    subscribed: permission === "granted" && !!token,
  };
}

export async function enablePushNotificationsNow() {
  return initPushNotifications();
}
