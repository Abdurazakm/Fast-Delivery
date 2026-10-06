import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

let messagingInstance = null;

export const getFirebaseMessaging = async () => {
  if (typeof window === "undefined") return null;
  const supported = await isSupported();
  if (!supported) return null;
  if (!messagingInstance) {
    messagingInstance = getMessaging(app);
  }
  return messagingInstance;
};

export const requestFirebaseToken = async () => {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return { token: null, error: "Notifications not supported in this browser." };
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { token: null, error: "permission-denied" };
    }

    const messaging = await getFirebaseMessaging();
    if (!messaging) {
      return { token: null, error: "Firebase messaging is not supported in this environment." };
    }

    const swRegistration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.warn("VITE_FIREBASE_VAPID_KEY is not set.");
    }

    const currentToken = await getToken(messaging, {
      vapidKey: vapidKey || undefined,
      serviceWorkerRegistration: swRegistration,
    });

    return { token: currentToken, error: null };
  } catch (err) {
    console.error("An error occurred while retrieving FCM token:", err);
    return { token: null, error: err?.message || "Failed to retrieve token" };
  }
};

export const onMessageListener = (callback) => {
  getFirebaseMessaging().then((messaging) => {
    if (messaging) {
      onMessage(messaging, (payload) => {
        if (callback) callback(payload);
      });
    }
  });
};

export default app;
