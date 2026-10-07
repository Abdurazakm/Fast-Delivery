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

const FALLBACK_VAPID_KEY =
  "BLoanI6vetrGPv-Jr4OI8ohxdxYAhhDzbbwynMgFc5fRNpVJ_LIulfgAaVybCHv-PrABXz39sVkrHoLlaxmZUv8";

export const requestFirebaseToken = async () => {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return { token: null, error: "Notifications not supported in this browser." };
    }

    let permission = Notification.permission;
    if (permission !== "granted") {
      permission = await Notification.requestPermission();
    }

    if (permission !== "granted") {
      return { token: null, error: "permission-denied" };
    }

    const messaging = await getFirebaseMessaging();
    if (!messaging) {
      return { token: null, error: "Firebase messaging is not supported in this environment." };
    }

    let swRegistration = await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js");
    if (!swRegistration) {
      swRegistration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    }

    // Wait until the service worker is active and ready
    swRegistration = await navigator.serviceWorker.ready;

    const vapidKey =
      import.meta.env.VITE_FIREBASE_VAPID_KEY || FALLBACK_VAPID_KEY;

    const currentToken = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swRegistration,
    });

    return { token: currentToken, error: null };
  } catch (err) {
    console.error("An error occurred while retrieving FCM token:", err);
    return { token: null, error: err?.message || "Failed to retrieve token" };
  }
};


export const onMessageListener = (callback) => {
  let unsubscribe = null;
  let active = true;

  getFirebaseMessaging().then((messaging) => {
    if (messaging && active) {
      unsubscribe = onMessage(messaging, (payload) => {
        if (callback && active) callback(payload);
      });
    }
  });

  return () => {
    active = false;
    if (typeof unsubscribe === "function") {
      unsubscribe();
    }
  };
};

export default app;
