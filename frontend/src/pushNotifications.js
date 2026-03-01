import API from "./api";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export async function initPushNotifications() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { enabled: false, reason: "unsupported" };
  }

  try {
    const keyRes = await API.get("/notifications/public-key");
    const publicKey = keyRes?.data?.publicKey;
    if (!publicKey) {
      return { enabled: false, reason: "missing-public-key" };
    }

    const registration = await navigator.serviceWorker.register("/sw.js");
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      return { enabled: false, reason: "permission-denied" };
    }

    const existingSubscription = await registration.pushManager.getSubscription();
    const subscription =
      existingSubscription ||
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      }));

    await API.post("/notifications/subscribe", {
      subscription: subscription.toJSON(),
    });

    return { enabled: true };
  } catch (err) {
    return { enabled: false, reason: "init-failed", error: err };
  }
}

export async function getPushNotificationStatus() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { supported: false, permission: "unsupported", subscribed: false };
  }

  let subscribed = false;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const existingSubscription = await registration.pushManager.getSubscription();
      subscribed = !!existingSubscription;
    }
  } catch (err) {
    subscribed = false;
  }

  return {
    supported: true,
    permission: Notification.permission,
    subscribed,
  };
}

export async function enablePushNotificationsNow() {
  return initPushNotifications();
}
