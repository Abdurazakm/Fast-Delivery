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
  const data = payload.data || {};
  const tag =
    data.tag ||
    (data.orderId
      ? `order-${data.orderId}`
      : data.trackingCode
        ? `order-${data.trackingCode}`
        : "fetan-update");

  if (!shouldDisplayNotification(tag)) return;

  const notificationTitle =
    data.title || payload.notification?.title || "Fetan Delivery";
  const notificationOptions = {
    body:
      data.message ||
      data.body ||
      payload.notification?.body ||
      "You have a new update.",
    icon: "/favicon.png",
    badge: "/favicon.png",
    vibrate: [200, 100, 200],
    requireInteraction: true,
    tag,
    renotify: true,
    data: {
      url: data.url || data.click_action || "/",
      ...data,
    },
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
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
  const url = event.request.url;
  if (
    url.startsWith("chrome-extension") ||
    url.includes("/@vite/") ||
    url.includes("/api/") ||
    url.includes("?v=") ||
    url.includes("socket.io")
  ) {
    return;
  }
  event.respondWith(
    fetch(event.request).catch(async () => {
      try {
        const cached = await caches.match(event.request);
        if (cached) return cached;
      } catch (_) {}
      return new Response("Offline", {
        status: 503,
        statusText: "Service Unavailable",
        headers: { "Content-Type": "text/plain" },
      });
    })
  );
});

