import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AiOutlineClose } from "react-icons/ai";
import { FaPlus, FaLaptopCode } from "react-icons/fa";
import { FiPhoneCall, FiInfo } from "react-icons/fi";
import { ArrowRight } from "lucide-react";
import { MdEventAvailable } from "react-icons/md";
import API from "../api";
import TrackingInfoCard from "./TrackingInfoCard";
import Toast from "./Toast"; // import your reusable Toast component
import OrderingInfoCards from "./OrderingInfoCards";
import { motion } from "framer-motion";
import { getSocket } from "../socket";
import {
  getPushNotificationStatus,
  enablePushNotificationsNow,
} from "../pushNotifications";
import { onMessageListener } from "../firebase";
import PushNotificationPrompt from "../components/PushNotificationPrompt";
import NotificationBell from "../components/NotificationBell";



const DEFAULT_ITEM_AVAILABILITY = {
  ertib: true,
  fetira: true,
  donut: true,
  sambusa: true,
  boiled_egg: true,
};

const MENU_ITEMS = [
  { id: "ertib", name: "Ertib", emoji: "🍲" },
  { id: "sambusa", name: "Sambusa", emoji: "🥟" },
  { id: "boiled_egg", name: "Boiled Egg", emoji: "🥚" },
  { id: "fetira", name: "Fetira", emoji: "🥞" },
  { id: "donut", name: "Donut", emoji: "🍩" },
];

export default function Home() {
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState("");
  const [serviceAvailable, setServiceAvailable] = useState(true);
  const [toast, setToast] = useState(null); // ✅ toast state
  const navigate = useNavigate();

  const [trackingCodeInput, setTrackingCodeInput] = useState("");
  const [trackingResult, setTrackingResult] = useState(null);
  const [trackingError, setTrackingError] = useState("");
  const [latestOrders, setLatestOrders] = useState([]);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [formattedCutoff, setFormattedCutoff] = useState(""); // <-- add this
  const [itemAvailability, setItemAvailability] = useState(
    DEFAULT_ITEM_AVAILABILITY,
  );
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushPermission, setPushPermission] = useState("default");
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushSupported, setPushSupported] = useState(true);
  const roleLower = (user?.role || "").toLowerCase();


  // Fetch user & latest order
  useEffect(() => {
    const fetchUserAndOrder = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        // 1️⃣ Fetch authenticated user
        const resUser = await API.get("/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const currentUser = resUser.data;
        setUser(currentUser);

        // 2️⃣ Fetch all recent orders (last 12 hours) for this user
        try {
          const resOrder = await API.get("/orders/latest", {
            headers: { Authorization: `Bearer ${token}` },
          });

          const orders = Array.isArray(resOrder.data)
            ? resOrder.data
            : resOrder.data
              ? [resOrder.data]
              : [];
          setLatestOrders(orders);
        } catch (err) {
          console.error("Failed to fetch latest orders:", err);
          setLatestOrders([]);
        }
      } catch (err) {
        console.error("❌ Failed to fetch user or order:", err);
        setUser(null);
        setLatestOrders([]);
      }
    };

    fetchUserAndOrder();
  }, []);

  // Updated handleTrackOrder for guests (today-only)
  const handleTrackOrder = async () => {
    const code = trackingCodeInput.trim();
    if (!code) {
      setTrackingError("Please enter your tracking code.");
      setTrackingResult(null);
      return;
    }

    try {
      setTrackingResult(null);
      setTrackingError("");

      const res = await API.get(`/orders/track/${code}`);

      if (!res.data) {
        setTrackingResult(null);
        setTrackingError("No order today with this tracking code.");
        return;
      }

      setTrackingResult(res.data);
      setTrackingError("");
    } catch (err) {
      console.error("❌ Tracking error:", err);
      setTrackingResult(null);
      if (err.response?.status === 404) {
        setTrackingError("No order today with this tracking code.");
      } else {
        setTrackingError("Server error. Please try again.");
      }
    }
  };
  // Convert cutoff time to 12-hour format with AM/PM + EAT
  const formatCutoffTime = (hour, minute) => {
    const h12 = hour % 12 || 12; // convert to 12-hour (0 → 12)
    const ampm = hour >= 12 ? "PM" : "AM";
    const paddedMin = minute.toString().padStart(2, "0");
    return `${h12}:${paddedMin} ${ampm} EAT`;
  };

  const getEATNowParts = (referenceDate = new Date()) => {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Africa/Addis_Ababa",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      hourCycle: "h23",
    });

    const parts = formatter.formatToParts(referenceDate);

    return {
      dayStr: parts.find((p) => p.type === "weekday")?.value,
      hour: Number(parts.find((p) => p.type === "hour")?.value ?? 0),
      minute: Number(parts.find((p) => p.type === "minute")?.value ?? 0),
    };
  };

  const applyAvailabilityState = (availability) => {
    if (!availability) {
      setServiceAvailable(true);
      setMessage(null);
      return;
    }

    const { weeklyDays, cutoffTime, isTemporarilyClosed, tempCloseReason } =
      availability;

    setItemAvailability({
      ...DEFAULT_ITEM_AVAILABILITY,
      ...(availability.itemAvailability || {}),
    });

    const now = new Date(Date.now() + serverOffsetMs);
    const nowEAT = getEATNowParts(now);
    const dayStr = nowEAT.dayStr;

    const withinDays = weeklyDays.includes(dayStr);
    const [cutHour, cutMinute] = cutoffTime.split(":").map(Number);

    const beforeCutoff =
      nowEAT.hour < cutHour ||
      (nowEAT.hour === cutHour && nowEAT.minute <= cutMinute);

    const cutoffFormatted = formatCutoffTime(cutHour, cutMinute);
    setFormattedCutoff(cutoffFormatted);

    const weekOrder = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const sortedDays = [...weeklyDays].sort(
      (a, b) => weekOrder.indexOf(a) - weekOrder.indexOf(b),
    );

    if (isTemporarilyClosed) {
      setServiceAvailable(false);
      setMessage(
        <span>
          ⚠️ Service temporarily closed.{" "}
          {tempCloseReason || "Please check back later."}
        </span>,
      );
    } else if (!withinDays) {
      setServiceAvailable(false);
      setMessage(
        <span className="flex flex-col gap-1">
          ⚠️ Our service is not available today. We operate on the following
          days: <strong>{sortedDays.join(", ")}</strong>.
        </span>,
      );
    } else if (!beforeCutoff) {
      setServiceAvailable(false);
      setMessage(
        <span className="flex flex-col gap-1">
          ⏰ Ordering for today has ended. Please make sure to place your order
          before {cutoffFormatted} on our service-available days. If there’s a
          chance we might still be at the Ertib place, you may contact us
          directly:
          <a
            href="tel:+251954724664"
            className="flex items-center gap-2 underline text-blue-600 font-semibold mt-1"
          >
            <FiPhoneCall size={16} />
            +251 95 472 4664
          </a>
        </span>,
      );
    } else {
      setServiceAvailable(true);
      setMessage(null);
    }
  };

  // Check service availability
  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const res = await API.get("/availability");
        applyAvailabilityState(res.data);
      } catch (err) {
        console.error("Failed to fetch availability:", err);
        setServiceAvailable(true);
        setMessage(null);
      }
    };

    fetchAvailability();

    const socket = getSocket();
    const handleAvailabilityUpdated = (payload) => {
      if (payload) {
        applyAvailabilityState(payload);
        return;
      }

      fetchAvailability();
    };

    socket.on("availability:updated", handleAvailabilityUpdated);

    return () => {
      socket.off("availability:updated", handleAvailabilityUpdated);
    };
  }, [serverOffsetMs]);

  const handleOrderClick = (foodOrEvent) => {
    const isString = typeof foodOrEvent === "string";
    const foodId = isString ? foodOrEvent : "ertib";

    if (
      isString &&
      itemAvailability[foodId] === false &&
      user?.role !== "admin"
    ) {
      setToast({
        message: `⚠️ ${MENU_ITEMS.find((item) => item.id === foodId)?.name || "This item"} is currently unavailable.`,
        type: "error",
      });
      return;
    }

    if (!serviceAvailable && user?.role !== "admin") {
      let warningMessage = "";

      if (message) {
        // If we already have a message from availability check
        warningMessage = message.props ? message.props.children : message;
      } else {
        // fallback
        warningMessage =
          "⚠️ Ordering is currently not available. Please check the availability schedule.";
      }

      setToast({
        message: warningMessage,
        type: "error",
      });
      return;
    }
    navigate(isString ? `/order?food=${foodId}` : "/order");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setToast({ message: "Logged out successfully!", type: "success" });
  };

  const refreshPushStatus = async () => {
    try {
      const status = await getPushNotificationStatus();
      setPushSupported(status.supported);
      const perm =
        status.permission ||
        (typeof Notification !== "undefined"
          ? Notification.permission
          : "default");
      setPushPermission(perm);

      if (perm === "granted") {
        setPushEnabled(true);
        if (!status.subscribed) {
          enablePushNotificationsNow().catch(() => {});
        }
      } else {
        setPushEnabled(false);
      }
    } catch {
      setPushSupported(false);
      setPushEnabled(false);
    }
  };

  useEffect(() => {
    refreshPushStatus().catch(() => {
      setPushSupported(false);
      setPushEnabled(false);
    });

    onMessageListener((payload) => {
      const title =
        payload.notification?.title ||
        payload.data?.title ||
        "New Notification";
      const body =
        payload.notification?.body ||
        payload.data?.message ||
        payload.data?.body ||
        "";
      setToast({
        message: body ? `${title}: ${body}` : title,
        type: "info",
      });
    });
  }, []);

  const handleEnableNotifications = async () => {
    const currentPerm =
      typeof Notification !== "undefined"
        ? Notification.permission
        : pushPermission;

    if (currentPerm === "denied") {
      setShowPermissionModal(true);
      return;
    }

    setPushLoading(true);
    try {
      const result = await enablePushNotificationsNow();
      await refreshPushStatus();

      if (result?.enabled) {
        setToast({
          message:
            "✅ Notifications enabled! You will receive live delivery alerts.",
          type: "success",
        });
      } else if (
        result?.reason === "permission-denied" ||
        (typeof Notification !== "undefined" &&
          Notification.permission === "denied")
      ) {
        setPushPermission("denied");
        setShowPermissionModal(true);
      } else {
        setToast({
          message: "⚠️ Could not enable notifications. Please try again.",
          type: "error",
        });
      }
    } catch (err) {
      setToast({
        message: "⚠️ Failed to enable notifications.",
        type: "error",
      });
    } finally {
      setPushLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-b from-amber-50 to-orange-100 p-6">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {roleLower !== "admin" && (
        <a
          href="#menu"
          className="group fixed top-2 left-2 z-50 inline-flex max-w-[calc(100vw-1rem)] items-center gap-2 overflow-hidden rounded-full px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-[0_14px_35px_rgba(234,88,12,0.28)] transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_22px_50px_rgba(234,88,12,0.42)] focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2 sm:top-4 sm:left-4 sm:max-w-none sm:px-4 sm:py-2.5 sm:text-sm"
        >
          <span
            aria-hidden="true"
            className="absolute -inset-2 rounded-full bg-linear-to-r from-amber-200/0 via-amber-200/35 to-pink-200/0 blur-xl opacity-80"
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full animate-spin blur-[1px]"
            style={{
              backgroundImage:
                "conic-gradient(from 0deg, rgba(255,255,255,0) 0 58%, #fbbf24 62%, #fb923c 68%, #f97316 74%, #f472b6 80%, #fde68a 86%, #fbbf24 92%, rgba(255,255,255,0) 100%)",
              animationDuration: "3.2s",
            }}
          />
          <span
            aria-hidden="true"
            className="absolute inset-0.5 rounded-full bg-linear-to-r from-amber-500 via-orange-500 to-red-500 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]"
          />
          <span className="relative z-10 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm sm:h-7 sm:w-7">
              <ArrowRight size={12} className="rotate-45 sm:text-[15px]" />
            </span>
            <span className="whitespace-nowrap leading-none">
              Explore Our Menu
            </span>
          </span>
        </a>
      )}
      {/* Top Right Auth & Notification Buttons */}
      <div className="w-full flex items-center justify-end max-w-6xl mb-6 gap-3">
        <NotificationBell />

        {user?.role === "admin" ? (
          <Link
            to="/availability"
            className="fixed top-4 left-4 z-50 inline-flex items-center gap-2 p-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-full shadow-lg transition-all duration-200"
          >
            {/* Icon goes here with a slight size adjustment if needed */}
            <MdEventAvailable className="text-xl" />
          </Link>
        ) : null}
        {!user ? (
          <Link
            to="/login"
            className="
      relative inline-flex items-center justify-center px-6 py-2
      font-semibold text-amber-800
      bg-white/90 border border-white
      rounded-full
      shadow-md
      transition-all duration-300
      hover:bg-white
      hover:shadow-lg
      active:scale-95
      focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-1
    "
          >
            <span className="relative z-10">Login</span>
            <span className="absolute inset-0 rounded-full bg-amber-200 opacity-10 blur-md pointer-events-none"></span>
          </Link>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-amber-800 font-medium text-sm sm:text-base">
              Hi👋,{" "}
              <span className="text-red-500 font-semibold">{user.name}</span>
            </span>
            <button
              onClick={handleLogout}
              className="
        relative inline-flex items-center justify-center px-4 py-2
        bg-red-600 text-white font-semibold
        rounded-full shadow-md
        transition-all duration-300
        hover:bg-red-700 hover:shadow-lg
        active:scale-95
        focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1
      "
            >
              Logout
              <span className="absolute inset-0 rounded-full bg-red-200 opacity-10 blur-md pointer-events-none"></span>
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-center">
        <button
          onClick={handleEnableNotifications}
          disabled={!pushSupported || pushLoading || (pushEnabled && pushPermission === "granted")}
          className={`px-5 py-2.5 rounded-full font-semibold shadow-md transition-all duration-200 flex items-center gap-2 ${
            pushEnabled && pushPermission === "granted"
              ? "bg-emerald-600 text-white cursor-default"
              : pushPermission === "denied"
                ? "bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 cursor-pointer"
                : !pushSupported
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                  : pushLoading
                    ? "bg-amber-300 text-white cursor-wait"
                    : "bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white cursor-pointer active:scale-95"
          }`}
          title={
            pushEnabled && pushPermission === "granted"
              ? "Notifications are enabled"
              : pushPermission === "denied"
                ? "Notifications are blocked in your browser. Tap to see how to fix it."
                : "Enable browser popup notifications"
          }
        >
          {pushEnabled && pushPermission === "granted" ? (
            <>
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span>🔔 Notifications Active</span>
            </>
          ) : pushPermission === "denied" ? (
            <>
              <span>🔒 Notifications Blocked (Tap to Fix)</span>
            </>
          ) : pushLoading ? (
            <>
              <span>Enabling...</span>
            </>
          ) : (
            <>
              <span>🔔 Enable Notifications</span>
            </>
          )}
        </button>
      </div>


      {user?.role !== "admin" && !serviceAvailable && message && (
        <div
          className="fixed top-4 z-50 left-2 right-2 sm:left-1/2 sm:-translate-x-1/2
               p-4 bg-red-100/50 backdrop-blur-sm text-red-800 border border-red-300/40
               rounded-xl flex justify-between items-start max-w-md shadow-lg"
        >
          <div className="text-lg font-medium">{message}</div>
          <button
            onClick={() => setMessage(null)}
            className="text-red-800 ml-4"
          >
            <AiOutlineClose size={20} />
          </button>
        </div>
      )}

      {/* Hero */}
      <div className="text-center max-w-2xl mt-6">
        <h1 className="text-3xl md:text-4xl font-bold mb-4 text-amber-700">
          Welcome To Fetan Delivery Service!
        </h1>
        <p className="text-gray-700 mb-3 text-lg">
          We deliver{" "}
          <span className="font-semibold text-amber-700">Leyla’s Ertib</span>{" "}
          straight from <span className="font-semibold">Tuludimtu</span> to your
          dorm — exclusively for{" "}
          <span className="font-semibold">AASTU students</span>! 🚴‍♂️
        </p>

        {/* Order + Dashboard buttons */}
        <div className="flex flex-row items-center justify-center gap-4 mt-6 w-full">
          {user?.role === "admin" ? (
            <Link
              to="/order"
              title="Create New Order"
              className="group relative inline-flex items-center justify-center overflow-hidden rounded-full p-3 text-white shadow-lg transition transform hover:-translate-y-0.5 hover:scale-105 hover:shadow-xl"
            >
              <span
                aria-hidden="true"
                className="absolute -inset-2 rounded-full bg-linear-to-r from-emerald-200/0 via-emerald-200/35 to-lime-200/0 blur-xl opacity-80"
              />
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-full animate-spin blur-[1px]"
                style={{
                  backgroundImage:
                    "conic-gradient(from 0deg, rgba(255,255,255,0) 0 56%, #34d399 60%, #22c55e 66%, #facc15 72%, #f59e0b 78%, #34d399 84%, rgba(255,255,255,0) 100%)",
                  animationDuration: "3.2s",
                }}
              />
              <span className="absolute inset-0.5 rounded-full bg-linear-to-r from-emerald-500 via-green-500 to-lime-500 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]" />
              <span className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
                <FaPlus size={18} />
              </span>
            </Link>
          ) : (
            <span className="relative group">
              {serviceAvailable && formattedCutoff && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-400 text-blue-800 text-sm rounded-lg flex items-start gap-3 shadow-sm"
                >
                  <FiInfo className="text-blue-600 mt-1" size={20} />
                  <div>
                    <p className="font-semibold text-blue-800">
                      🕒 Today's Ordering Cutoff:{" "}
                      <strong>{formattedCutoff}</strong>
                    </p>
                    <p className="text-gray-700 mt-1">
                      Kindly place your order before the cutoff to ensure timely
                      delivery.
                    </p>
                  </div>
                </motion.div>
              )}

              <button
                onClick={handleOrderClick}
                className={`group relative overflow-hidden rounded-full px-6 py-3 font-semibold transition transform shadow-lg ${
                  serviceAvailable
                    ? "text-white hover:-translate-y-0.5 hover:scale-105 hover:shadow-xl"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed opacity-70"
                }`}
              >
                {serviceAvailable && (
                  <>
                    <span
                      aria-hidden="true"
                      className="absolute -inset-2 rounded-full bg-linear-to-r from-emerald-200/0 via-emerald-200/35 to-lime-200/0 blur-xl opacity-80"
                    />
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 rounded-full animate-spin blur-[1px]"
                      style={{
                        backgroundImage:
                          "conic-gradient(from 0deg, rgba(255,255,255,0) 0 56%, #34d399 60%, #22c55e 66%, #facc15 72%, #f59e0b 78%, #34d399 84%, rgba(255,255,255,0) 100%)",
                        animationDuration: "3.2s",
                      }}
                    />
                    <span
                      aria-hidden="true"
                      className="absolute inset-0.5 rounded-full bg-linear-to-r from-emerald-500 via-green-500 to-lime-500 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]"
                    />
                  </>
                )}
                <span className="relative z-10">
                  {serviceAvailable ? (
                    <>{user ? "Place Your Order" : "Order Directly"}</>
                  ) : (
                    <span className="invisible">
                      {user ? "Place Your Order" : "Order Directly"}
                    </span>
                  )}
                </span>
              </button>

              {!serviceAvailable && (
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold bg-gray-300 text-gray-500 cursor-not-allowed opacity-70 bg-opacity-50 rounded-full pointer-events-none">
                  ⚠️closed
                </span>
              )}
            </span>
          )}

          {(roleLower === "admin" ||
            roleLower === "employ" ||
            roleLower === "employee" ||
            roleLower === "supleyer") && (
            <Link
              to="/admin"
              title="Admin Dashboard"
              className="p-3 rounded-full bg-purple-600 text-white shadow-md transition transform flex items-center justify-center hover:bg-purple-700 hover:scale-105 hover:shadow-xl"
            >
              <ArrowRight size={18} strokeWidth={2.5} />
            </Link>
          )}
        </div>
      </div>
      {/* // Inside return(), below Hero section */}
      <OrderingInfoCards serverOffsetMs={serverOffsetMs} />

      <div className="mt-4">
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
            pushEnabled && pushPermission === "granted"
              ? "bg-green-100 text-green-700 border-green-300"
              : pushPermission === "denied"
                ? "bg-amber-100 text-amber-800 border-amber-300"
                : "bg-gray-100 text-gray-600 border-gray-300"
          }`}
        >
          {pushEnabled && pushPermission === "granted"
            ? "🔔 Notification status: Enabled"
            : pushPermission === "denied"
              ? "🔒 Notification status: Blocked in Browser"
              : "🔕 Notification status: Not enabled"}
        </span>
      </div>


      {/* Track Your Order */}
      {user?.role !== "admin" && (
        <div className="mt-10 max-w-md w-full mx-auto bg-white p-6 rounded-2xl shadow text-center">
          <h3 className="font-semibold text-lg mb-3 text-amber-700">
            Track Your Order
          </h3>

          {/* Authenticated users */}
          {user ? (
            <>
              {latestOrders.length > 0 ? (
                <div className="space-y-3">
                  {latestOrders.map((orderItem, index) => {
                    const label =
                      index === 0
                        ? "Most recent order"
                        : `Recent order #${index + 1}`;

                    return (
                      <div
                        key={orderItem.id || orderItem.trackingCode || index}
                        className="text-left"
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-1">
                          {label}
                        </p>
                        <TrackingInfoCard order={orderItem} />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-amber-500 text-sm text-center py-3">
                  You have no orders in the last 12 hours.
                </div>
              )}
            </>
          ) : (
            /* Guest users: manual tracking */
            <div className="flex flex-col gap-3 mb-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Enter your tracking code"
                  value={trackingCodeInput}
                  onChange={(e) => setTrackingCodeInput(e.target.value)}
                  className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 min-w-0 text-center placeholder:text-center text-sm"
                />
                <button
                  onClick={handleTrackOrder}
                  className="w-full sm:w-auto px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition text-sm"
                >
                  Track
                </button>
              </div>

              {trackingError && (
                <div className="text-red-600 text-sm">{trackingError}</div>
              )}

              {trackingResult && (
                <div className="mt-3">
                  <TrackingInfoCard order={trackingResult} />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div id="menu" className="mt-12 max-w-4xl w-full px-4 scroll-mt-28">
        <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center text-amber-700">
          Explore Our Menu
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {MENU_ITEMS.map((food) => {
            const isFoodAvailable = itemAvailability[food.id] !== false;
            const isBlockedForCustomer =
              !isFoodAvailable && user?.role !== "admin";

            return (
              <div
                key={food.id}
                onClick={() => handleOrderClick(food.id)}
                className={`bg-white p-5 rounded-2xl shadow-md transition-all duration-300 border border-amber-100 flex flex-col items-center justify-center gap-2 group ${
                  isBlockedForCustomer
                    ? "opacity-70 cursor-not-allowed"
                    : "cursor-pointer hover:-translate-y-1.5 hover:shadow-[0_18px_40px_rgba(217,119,6,0.18)] hover:border-amber-200"
                }`}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-amber-100 via-white to-orange-100 text-4xl shadow-inner ring-1 ring-amber-100 transition-all duration-300 group-hover:scale-110 group-hover:-rotate-6 group-hover:shadow-lg">
                  {food.emoji}
                </div>
                <span className="font-semibold text-amber-900 text-sm md:text-base text-center transition-colors duration-300 group-hover:text-amber-700">
                  {food.name}
                </span>

                <span
                  className={`text-[11px] px-3 py-1 rounded-full border backdrop-blur-sm transition-all duration-300 ${
                    isFoodAvailable
                      ? "bg-emerald-50/90 border-emerald-300 text-emerald-700 group-hover:bg-emerald-100"
                      : "bg-red-50/90 border-red-300 text-red-700"
                  }`}
                >
                  {isFoodAvailable ? "Available" : "Unavailable"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-4xl">
        <div className="bg-white p-6 rounded-2xl shadow text-center">
          <h3 className="font-semibold text-lg mb-1 text-amber-700">
            Fetan Campus Delivery
          </h3>
          <p className="text-gray-600 text-sm">
            We deliver your favorite Ertib quickly and fresh!
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow text-center">
          <h3 className="font-semibold text-lg mb-1 text-amber-700">
            Exclusive for AASTU
          </h3>
          <p className="text-gray-600 text-sm">
            Only available for AASTU students.
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow text-center">
          <h3 className="font-semibold text-lg mb-1 text-amber-700">
            Easy Contact
          </h3>
          <p className="text-gray-600 text-sm flex items-center gap-1">
            Call us anytime:{" "}
            <a
              href="tel:+251954724664"
              className="text-amber-700 font-semibold hover:underline flex items-center gap-1"
            >
              <FiPhoneCall size={16} className="text-amber-700" />
              +251 95 472 4664
            </a>
          </p>
        </div>
      </div>

      {/* Footer */}

      {/* Footer */}
      <footer className="mt-12 text-gray-600 text-center flex flex-col items-center gap-2">
        <div>
          © {new Date().getFullYear()} Fetan Delivery Service — Exclusively for
          AASTU Students.
        </div>
        <a
          href="https://abdurazakmohammed.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-full shadow-sm hover:bg-amber-100 hover:text-amber-700 transition transform hover:scale-105"
        >
          <FaLaptopCode className="animate-bounce-slow" size={16} />
          Developed by Abdurazak
        </a>
      </footer>

      {/* Soft Push Notification Opt-in Prompt */}
      <PushNotificationPrompt mode="soft-modal" onStatusChange={refreshPushStatus} />

      {/* Visual Unblock Modal for Denied Permissions */}
      {showPermissionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-[calc(100vw-2rem)] sm:max-w-sm mx-auto shadow-2xl relative">
            <button
              onClick={() => setShowPermissionModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full cursor-pointer"
            >
              ✕
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-3 text-2xl font-bold shadow-inner">
              🔒
            </div>

            <h3 className="text-base font-bold text-gray-900 text-center mb-1">
              Notifications are Blocked
            </h3>
            <p className="text-xs text-gray-500 text-center mb-4">
              Your browser has notifications set to <b>Blocked</b>. Follow these 3 simple steps to unblock:
            </p>

            <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 text-xs space-y-2.5 text-gray-700">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                <span>Look at your browser's address bar at the top (next to <b>https://...</b>).</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                <span>Tap the <b>🔒 Lock</b> or <b>Site Settings / Tune (⚙️)</b> icon.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                <span>Switch <b>Notifications</b> from <i>Blocked</i> to <b>Allow</b>, then refresh!</span>
              </div>
            </div>

            <button
              onClick={() => {
                setShowPermissionModal(false);
                window.location.reload();
              }}
              className="w-full mt-4 bg-linear-to-r from-amber-500 to-orange-500 text-white font-semibold py-2.5 rounded-xl text-xs shadow hover:from-amber-600 hover:to-orange-600 transition cursor-pointer"
            >
              I Allowed It (Reload Page)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


