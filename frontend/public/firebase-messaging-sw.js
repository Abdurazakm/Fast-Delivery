importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey: "AIzaSyCJLkainw7V2_4QnazM09F4id4hmHLHTvg",
  authDomain: "fetandelivery-33b96.firebaseapp.com",
  projectId: "fetandelivery-33b96",
  storageBucket: "fetandelivery-33b96.firebasestorage.app",
  messagingSenderId: "798336173434",
  appId: "1:798336173434:web:d39130bc57e5ee6cfe42c3",
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

let lastShownTag = null;
let lastShownTime = 0;

function shouldDisplayNotification(tag) {
  const now = Date.now();
  if (lastShownTag && lastShownTag === tag && now - lastShownTime < 5000) {
    return false;
  }
  lastShownTag = tag;
  lastShownTime = now;
  return true;
}

messaging.onBackgroundMessage((payload) => {
  const tag = payload.data?.orderId
    ? `order-${payload.data.orderId}-${payload.data.status || ""}`
    : payload.data?.trackingCode
      ? `order-${payload.data.trackingCode}-${payload.data.status || ""}`
      : "fetan-update";

  if (!shouldDisplayNotification(tag)) return;

  const notificationTitle = payload.notification?.title || payload.data?.title || "Fetan Delivery";
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.message || payload.data?.body || "You have a new update.",
    icon: "/favicon.png",
    badge: "/favicon.png",
    vibrate: [200, 100, 200],
    requireInteraction: true,
    tag,
    renotify: true,
    data: {
      url: payload.data?.url || payload.data?.click_action || "/",
      ...payload.data,
    },
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Native push listener: guarantees delivery on inactive/sleeping devices & closed browsers
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch (err) {
    try {
      payload = { notification: { body: event.data.text() } };
    } catch {}
  }

  const tag = payload.data?.orderId
    ? `order-${payload.data.orderId}-${payload.data.status || ""}`
    : payload.data?.trackingCode
      ? `order-${payload.data.trackingCode}-${payload.data.status || ""}`
      : "fetan-update";

  if (!shouldDisplayNotification(tag)) return;

  const title = payload.notification?.title || payload.data?.title || "Fetan Delivery";
  const body =
    payload.notification?.body ||
    payload.data?.message ||
    payload.data?.body ||
    "You have a new order update.";
  const url =
    payload.data?.url ||
    payload.data?.click_action ||
    payload.fcmOptions?.link ||
    "/";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/favicon.png",
      badge: "/favicon.png",
      vibrate: [200, 100, 200],
      requireInteraction: true,
      tag,
      renotify: true,
      data: {
        url,
        ...payload.data,
      },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
      return null;
    })
  );
});

// PWA Service Worker lifecycle
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Pass-through fetch handler required for PWA installation criteria
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

