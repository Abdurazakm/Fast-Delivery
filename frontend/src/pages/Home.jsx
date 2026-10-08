import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Phone,
  Clock,
  Sparkles,
  Search,
  ShieldCheck,
  Utensils,
  MapPin,
  X,
  ExternalLink,
} from "lucide-react";
import API from "../api";
import TrackingInfoCard from "./TrackingInfoCard";
import Toast from "./Toast";
import { motion, AnimatePresence } from "framer-motion";
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
  {
    id: "ertib",
    name: "Ertib",
    emoji: "🍲",
    desc: "Famous Leyla recipe with crispy felafil & fresh bread",
    pricePrefix: "From",
    priceKey: "ertibNormalPrice",
    defaultPrice: 145,
  },
  {
    id: "fetira",
    name: "Fetira",
    emoji: "🥞",
    desc: "Flaky layered flatbread with eggs & honey",
    pricePrefix: "",
    priceKey: "fetiraBasePrice",
    defaultPrice: 150,
  },
  {
    id: "sambusa",
    name: "Sambusa",
    emoji: "🥟",
    desc: "Golden crispy pastry with spiced filling",
    pricePrefix: "",
    priceKey: "sambusaPrice",
    defaultPrice: 30,
  },
  {
    id: "donut",
    name: "Donut",
    emoji: "🍩",
    desc: "Fresh soft glazed doughnuts in pairs",
    pricePrefix: "From",
    priceKey: "donut1PairPackagePrice",
    defaultPrice: 60,
  },
  {
    id: "boiled_egg",
    name: "Boiled Egg",
    emoji: "🥚",
    desc: "Nutritious quick protein boiled fresh",
    pricePrefix: "",
    priceKey: "boiledEggPrice",
    defaultPrice: 30,
  },
];

export default function Home() {
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState("");
  const [serviceAvailable, setServiceAvailable] = useState(true);
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  const [trackingCodeInput, setTrackingCodeInput] = useState("");
  const [trackingResult, setTrackingResult] = useState(null);
  const [trackingError, setTrackingError] = useState("");
  const [latestOrders, setLatestOrders] = useState([]);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [formattedCutoff, setFormattedCutoff] = useState("");
  const [itemAvailability, setItemAvailability] = useState(
    DEFAULT_ITEM_AVAILABILITY,
  );
  const [pricing, setPricing] = useState({
    ertibNormalPrice: 145,
    fetiraBasePrice: 150,
    donut1PairPackagePrice: 60,
    sambusaPrice: 30,
    boiledEggPrice: 30,
  });

  const roleLower = (user?.role || "").toLowerCase();

  // Load pricing
  useEffect(() => {
    API.get("/orders/pricing")
      .then((res) => {
        if (res.data) setPricing((prev) => ({ ...prev, ...res.data }));
      })
      .catch(() => {});
  }, []);

  // Fetch user & latest orders
  useEffect(() => {
    const fetchUserAndOrder = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const resUser = await API.get("/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(resUser.data);

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
        } catch {
          setLatestOrders([]);
        }
      } catch {
        setUser(null);
        setLatestOrders([]);
      }
    };

    fetchUserAndOrder();
  }, []);

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
        setTrackingError("No order found with this tracking code.");
        return;
      }

      setTrackingResult(res.data);
      setTrackingError("");
    } catch (err) {
      setTrackingResult(null);
      if (err.response?.status === 404) {
        setTrackingError("No order found with this tracking code.");
      } else {
        setTrackingError("Server error. Please try again.");
      }
    }
  };

  const formatCutoffTime = (hour, minute) => {
    const h12 = hour % 12 || 12;
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

    const withinDays = weeklyDays.includes(nowEAT.dayStr);
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
        <span>
          ⚠️ Our service is not available today. We operate on:{" "}
          <strong>{sortedDays.join(", ")}</strong>.
        </span>,
      );
    } else if (!beforeCutoff) {
      setServiceAvailable(false);
      setMessage(
        <span>
          ⏰ Ordering for today has ended (cutoff was {cutoffFormatted}).
        </span>,
      );
    } else {
      setServiceAvailable(true);
      setMessage(null);
    }
  };

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const res = await API.get("/availability");
        applyAvailabilityState(res.data);
      } catch {
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
        message: `⚠️ ${MENU_ITEMS.find((item) => item.id === foodId)?.name || "This item"} is currently sold out.`,
        type: "error",
      });
      return;
    }

    if (!serviceAvailable && user?.role !== "admin") {
      let warningMessage =
        "⚠️ Ordering is currently not available. Please check the schedule.";
      if (message) {
        warningMessage = message.props ? message.props.children : message;
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

  return (
    <div className="min-h-screen bg-gray-50/70 text-gray-900 flex flex-col justify-between selection:bg-amber-100 selection:text-amber-900">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Modern Sticky Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          {/* Logo & Campus Pill */}
          <Link to="/" className="flex items-center gap-2 group">
            <span className="text-2xl">🍲</span>
            <div className="flex flex-col">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-gray-950 group-hover:text-amber-600 transition">
                Fetan Delivery
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 leading-none">
                AASTU Campus
              </span>
            </div>
          </Link>

          {/* Right Header Navigation */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Admin Dashboard shortcut */}
            {roleLower === "admin" && (
              <Link
                to="/admin"
                className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition flex items-center gap-1"
              >
                <span>Dashboard</span>
              </Link>
            )}

            {/* Menu link */}
            <Link
              to="/menu"
              className="text-xs sm:text-sm font-bold text-gray-700 hover:text-amber-600 px-3 py-1.5 rounded-xl hover:bg-amber-50 transition"
            >
              Menu
            </Link>

            {/* Notification Bell with live count */}
            <NotificationBell />

            {/* Auth / Profile Pill */}
            {!user ? (
              <Link
                to="/login"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition active:scale-95"
              >
                Login
              </Link>
            ) : (
              <div className="flex items-center gap-2 bg-gray-100/80 px-2.5 py-1.5 rounded-xl border border-gray-200/60">
                <span className="text-xs font-semibold text-gray-700 hidden sm:inline">
                  Hi, <strong className="text-amber-800">{user.name}</strong>
                </span>
                <button
                  onClick={handleLogout}
                  className="text-xs text-rose-600 hover:text-rose-800 font-semibold cursor-pointer pl-1"
                  title="Logout"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 pt-6 sm:pt-10 pb-16 space-y-12">
        {/* Service Warning Banner (if closed) */}
        {user?.role !== "admin" && !serviceAvailable && message && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-2.5">
              <span className="text-lg">⏰</span>
              <div>{message}</div>
            </div>
            <button
              onClick={() => setMessage(null)}
              className="text-amber-700 hover:text-amber-900 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Hero Section */}
        <section className="text-center max-w-2xl mx-auto pt-2 sm:pt-4 space-y-4">
          {/* Availability Status Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-gray-300 text-xs sm:text-sm shadow-xs">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                serviceAvailable
                  ? "bg-emerald-500 animate-pulse"
                  : "bg-amber-500"
              }`}
            />
            {serviceAvailable ? (
              <span className="font-bold text-gray-800">
                Accepting Orders • Cutoff:{" "}
                <strong className="text-amber-800 font-extrabold">
                  {formattedCutoff || "6:00 PM"}
                </strong>
              </span>
            ) : (
              <span className="font-bold text-gray-700">
                Ordering Currently Closed
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-gray-950 tracking-tight leading-tight">
            Hot & Fresh Food, <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-amber-600 to-orange-600">
              Delivered To Your Dorm.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-gray-700 max-w-lg mx-auto font-medium leading-relaxed">
            Leyla's famous Tuludimtu Ertib, sweet Fetira, crispy Sambusa & donuts — delivered fast and hot straight to AASTU dorm blocks!
          </p>

          {/* Primary Call-to-Actions (Mobile First: Full-width stacked on mobile, inline on desktop) */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
            <button
              onClick={() => handleOrderClick("ertib")}
              className={`w-full sm:w-auto min-h-[50px] px-8 py-3.5 rounded-2xl font-extrabold text-sm sm:text-base transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                serviceAvailable || user?.role === "admin"
                  ? "bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white shadow-amber-200/60 active:scale-98"
                  : "bg-gray-200 text-gray-500 cursor-not-allowed border border-gray-300"
              }`}
            >
              <Utensils className="w-5 h-5 shrink-0" />
              <span>{serviceAvailable ? "Place Your Order" : "Ordering Closed"}</span>
              <ArrowRight className="w-4 h-4 ml-0.5 shrink-0" />
            </button>

            <Link
              to="/menu"
              className="w-full sm:w-auto min-h-[50px] px-7 py-3.5 rounded-2xl bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-900 border-2 border-gray-200 font-extrabold text-sm sm:text-base shadow-xs transition hover:border-amber-300 active:scale-98 flex items-center justify-center gap-2 group"
            >
              <span>Explore Menu</span>
              <ArrowRight className="w-4 h-4 text-amber-600 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </section>

        {/* Active Orders Section (If logged-in and active orders exist) */}
        {latestOrders.length > 0 && user?.role !== "admin" && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-extrabold text-gray-950 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Your Active Orders</span>
              </h2>
              <span className="text-xs font-semibold text-gray-600">Last 12 hours</span>
            </div>
            <div className="space-y-4">
              {latestOrders.map((orderItem) => (
                <TrackingInfoCard
                  key={orderItem.id || orderItem.trackingCode}
                  order={orderItem}
                />
              ))}
            </div>
          </section>
        )}



        {/* Track Order By Code Section (For Guests or Quick Lookup) */}
        {latestOrders.length === 0 && (
          <section className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 sm:p-8 max-w-xl mx-auto text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto text-2xl shadow-xs">
              🔍
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-gray-950">
                Track Existing Order
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 font-medium mt-1">
                Have a tracking code? Enter it below to check delivery progress.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 max-w-md mx-auto w-full">
              <input
                type="text"
                placeholder="e.g. FD-523814"
                value={trackingCodeInput}
                onChange={(e) => setTrackingCodeInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTrackOrder()}
                className="flex-1 min-h-[48px] px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 text-base font-mono font-bold text-gray-950 text-center sm:text-left uppercase placeholder:capitalize transition"
              />
              <button
                type="button"
                onClick={handleTrackOrder}
                className="min-h-[48px] px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-sm sm:text-base font-extrabold shadow-md shadow-amber-200/60 transition cursor-pointer active:scale-98"
              >
                Track Order
              </button>
            </div>

            {trackingError && (
              <p className="text-xs font-bold text-rose-600">
                {trackingError}
              </p>
            )}

            {trackingResult && (
              <div className="pt-4 text-left">
                <TrackingInfoCard order={trackingResult} />
              </div>
            )}
          </section>
        )}

        {/* Why Choose Fetan Delivery (Trust Badges) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-gray-950">
                Direct To Dorm Blocks
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 font-medium mt-0.5 leading-relaxed">
                We deliver directly to AASTU student dorms without walking to the campus gate.
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-gray-950">
                Fresh & Made To Order
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 font-medium mt-0.5 leading-relaxed">
                Prepared hot and fresh from Leyla’s Tuludimtu kitchen daily.
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-gray-950">
                Instant Support
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 font-medium mt-0.5 leading-relaxed">
                Call or Telegram us directly at{" "}
                <a
                  href="tel:+251954724664"
                  className="font-bold text-amber-800 hover:underline"
                >
                  +251 95 472 4664
                </a>
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Clean Modern Footer */}
      <footer className="border-t border-gray-200/80 bg-white py-6 text-center text-xs text-gray-500">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            © {new Date().getFullYear()} Fetan Delivery Service — Exclusively for AASTU Students.
          </p>
          <a
            href="https://abdurazakmohammed.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 hover:text-amber-700 font-medium transition flex items-center gap-1"
          >
            <span>Developed by Abdurazak</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </footer>

      {/* Soft Push Notification Opt-in Prompt */}
      <PushNotificationPrompt mode="soft-modal" />
    </div>
  );
}
