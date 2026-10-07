import { useState, useEffect } from "react";
import {
  Bell,
  BellRing,
  CheckCircle2,
  X,
  ShieldAlert,
  RefreshCw,
  Lock,
} from "lucide-react";
import {
  getPushNotificationStatus,
  enablePushNotificationsNow,
} from "../pushNotifications";
import { maskTrackingCode } from "../notificationStore";
import API from "../api";

const DISMISS_KEY = "fcm_prompt_dismissed_until";
const DISMISS_DAYS = 5;

export default function PushNotificationPrompt({
  mode = "inline", // "inline" | "soft-modal" | "order-modal"
  order = null,
  onStatusChange,
}) {
  const [permission, setPermission] = useState("default");
  const [supported, setSupported] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [showBlockedGuide, setShowBlockedGuide] = useState(false);

  const maskedCode = order?.trackingCode ? maskTrackingCode(order.trackingCode) : "";

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const status = await getPushNotificationStatus();
      setSupported(status.supported);
      setPermission(status.permission);
      setIsSubscribed(status.subscribed);

      if (status.permission === "granted" && status.subscribed) {
        setDismissed(true);
        if (onStatusChange) onStatusChange(true);
        return;
      }

      // Check if user clicked "Maybe Later" recently (for soft-modal)
      const dismissedUntil = localStorage.getItem(DISMISS_KEY);
      if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
        setDismissed(true);
      } else {
        setDismissed(false);
      }
    } catch {
      setSupported(false);
    }
  };

  const handleDismiss = () => {
    const expireTime = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, String(expireTime));
    setDismissed(true);
  };

  const handleEnable = async () => {
    setLoading(true);
    setShowBlockedGuide(false);
    try {
      const result = await enablePushNotificationsNow();
      await checkStatus();

      if (result?.enabled) {
        // If an order is currently active, link this token with the order's phone & tracking code
        const activePhone = order?.phone || localStorage.getItem("last_order_phone");
        const activeTracking = order?.trackingCode || localStorage.getItem("last_order_tracking");
        if (activePhone || activeTracking) {
          await API.post("/notifications/register-token", {
            token: result.token || localStorage.getItem("fcm_token"),
            phone: activePhone,
            trackingCode: activeTracking,
          }).catch(() => {});
        }
        if (onStatusChange) onStatusChange(true);
      } else if (result?.reason === "permission-denied" || Notification.permission === "denied") {
        setShowBlockedGuide(true);
        setPermission("denied");
      }
    } catch (err) {
      console.error("Failed to enable push notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckAgain = async () => {
    setLoading(true);
    try {
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") {
          await handleEnable();
          return;
        } else if (Notification.permission === "default") {
          await handleEnable();
          return;
        }
      }
      await checkStatus();
    } finally {
      setLoading(false);
    }
  };

  if (!supported) return null;

  // -------------------------------------------------------------
  // Mode A: Post-Order / Tracking Page Inline Card
  // -------------------------------------------------------------
  if (mode === "inline") {
    if (isSubscribed && permission === "granted") {
      return (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 my-3 flex items-center gap-3 text-emerald-800 shadow-xs">
          <div className="p-2 bg-emerald-100 rounded-full text-emerald-600 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-900">
              Live Delivery Alerts Active {maskedCode ? `(${maskedCode})` : ""}
            </p>
            <p className="text-xs text-emerald-700">
              You will receive real-time push alerts whenever your order status updates.
            </p>
          </div>
        </div>
      );
    }

    if (permission === "denied" || showBlockedGuide) {
      return (
        <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-4 my-3 text-amber-900 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl mt-0.5 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0 text-xs">
              <h5 className="font-bold text-sm text-amber-950 mb-1">
                Notifications are turned off for this site
              </h5>
              <p className="text-amber-800 leading-relaxed mb-2.5">
                To receive live updates {maskedCode ? `for order (${maskedCode})` : "on your delivery"}, please enable notifications in your browser settings:
              </p>
              <div className="bg-white/80 border border-amber-200 rounded-xl p-2.5 mb-3 text-[11px] text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-medium">
                  <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>1. Click the lock or settings icon in the address bar.</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium pl-5">
                  <span>2. Switch <b>Notifications</b> to <b>Allow</b>.</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCheckAgain}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                {loading ? "Checking..." : "I've Allowed It, Check Again"}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl p-4 sm:p-5 my-3 shadow-lg relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-xs text-white shrink-0">
              <BellRing className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <h4 className="font-bold text-base">
                Enable Live Delivery Alerts {maskedCode ? `(${maskedCode})` : ""}
              </h4>
              <p className="text-xs text-white/90 leading-relaxed">
                Turn on notifications to get an instant alert when your food is cooking and when the courier arrives!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleEnable}
            disabled={loading}
            className="bg-white text-amber-600 hover:bg-amber-50 font-bold px-5 py-2.5 rounded-xl text-sm shadow-md transition-all duration-150 whitespace-nowrap self-start sm:self-auto disabled:opacity-60 cursor-pointer active:scale-95"
          >
            {loading ? "Enabling..." : "Turn On Live Alerts"}
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Mode B: Soft-Ask Modal (Best Practice for Visitors)
  // -------------------------------------------------------------
  if (dismissed || isSubscribed || permission === "granted" || permission === "denied") {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 w-full max-w-[calc(100vw-2rem)] sm:max-w-sm mx-auto shadow-2xl border border-gray-100 relative">
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-4 mx-auto shadow-inner">
          <Bell className="w-7 h-7" />
        </div>

        <h3 className="text-lg font-bold text-gray-900 text-center mb-1">
          Stay Updated on Your Food!
        </h3>
        <p className="text-xs text-gray-500 text-center leading-relaxed mb-6">
          Never miss an order update. We will send you instant alerts when your food is being prepared and when the courier is nearby.
        </p>

        <div className="space-y-2">
          <button
            onClick={handleEnable}
            disabled={loading}
            className="w-full bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-3 rounded-xl text-sm shadow-md transition-all duration-150 disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Enabling Alerts..." : "Enable Notifications"}
          </button>
          <button
            onClick={handleDismiss}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium py-2.5 rounded-xl text-xs transition cursor-pointer"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
