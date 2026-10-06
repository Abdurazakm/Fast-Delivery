import { useState, useEffect } from "react";
import { Bell, BellRing, CheckCircle2, AlertCircle, X, ShieldAlert } from "lucide-react";
import {
  getPushNotificationStatus,
  enablePushNotificationsNow,
} from "../pushNotifications";
import API from "../api";

const DISMISS_KEY = "fcm_prompt_dismissed_until";
const DISMISS_DAYS = 5;

export default function PushNotificationPrompt({
  mode = "inline", // "inline" | "soft-modal"
  order = null,
  onStatusChange,
}) {
  const [permission, setPermission] = useState("default");
  const [supported, setSupported] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [showBlockedGuide, setShowBlockedGuide] = useState(false);

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

      // Check if user clicked "Maybe Later" recently
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
        // If an order is currently active, link this token with the order's phone number
        if (order?.phone || order?.trackingCode) {
          await API.post("/notifications/register-token", {
            token: result.token || localStorage.getItem("fcm_token"),
            phone: order.phone,
            trackingCode: order.trackingCode,
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

  if (!supported) return null;

  // -------------------------------------------------------------
  // Mode A: Post-Order / Tracking Page Inline Card
  // -------------------------------------------------------------
  if (mode === "inline") {
    if (isSubscribed && permission === "granted") {
      return (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 my-4 flex items-center gap-3 text-emerald-800 shadow-xs">
          <div className="p-2 bg-emerald-100 rounded-full text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Live Delivery Alerts Active</p>
            <p className="text-xs text-emerald-700">
              You will receive instant popup notifications whenever your order status updates.
            </p>
          </div>
        </div>
      );
    }

    if (permission === "denied" || showBlockedGuide) {
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 my-4 text-amber-900 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-full text-amber-600 mt-0.5">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="text-xs leading-relaxed">
              <p className="text-sm font-semibold mb-1">Notifications are blocked</p>
              <p>
                To get live order tracking alerts, click the <b>lock or site settings icon (🔒)</b> next to your browser address bar and switch Notifications to <b>Allow</b>.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-linear-to-r from-amber-500 to-orange-500 text-white rounded-2xl p-5 my-4 shadow-lg relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-xs text-white">
              <BellRing className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <h4 className="font-bold text-base">Enable Live Delivery Alerts</h4>
              <p className="text-xs text-white/90">
                Get an instant popup alert when your food is preparing and when the courier arrives!
              </p>
            </div>
          </div>
          <button
            onClick={handleEnable}
            disabled={loading}
            className="bg-white text-amber-600 hover:bg-amber-50 font-semibold px-5 py-2.5 rounded-xl text-sm shadow transition-all duration-150 whitespace-nowrap self-start sm:self-auto disabled:opacity-60"
          >
            {loading ? "Enabling..." : "Turn On Alerts"}
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
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full"
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
            className="w-full bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-3 rounded-xl text-sm shadow-md transition-all duration-150 disabled:opacity-50"
          >
            {loading ? "Enabling Alerts..." : "Enable Notifications"}
          </button>
          <button
            onClick={handleDismiss}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium py-2.5 rounded-xl text-xs transition"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
