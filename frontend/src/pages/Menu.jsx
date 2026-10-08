import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Phone,
  Clock,
  Sparkles,
  ShieldCheck,
  Utensils,
  MapPin,
  X,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import API from "../api";
import Toast from "./Toast";
import { getSocket } from "../socket";
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
    category: "mains",
    badge: "Most Popular",
    emoji: "🍲",
    desc: "Famous Leyla recipe with crispy felafil & fresh bread. Highly customizable with extra ketchup and double felafil.",
    pricePrefix: "From",
    priceKey: "ertibNormalPrice",
    defaultPrice: 145,
  },
  {
    id: "fetira",
    name: "Fetira",
    category: "mains",
    badge: "Student Favorite",
    emoji: "🥞",
    desc: "Flaky layered golden flatbread served with fresh eggs & honey. Wholesome and filling for study sessions.",
    pricePrefix: "From",
    priceKey: "fetiraBasePrice",
    defaultPrice: 150,
  },
  {
    id: "sambusa",
    name: "Sambusa",
    category: "snacks",
    badge: "Crispy Snack",
    emoji: "🥟",
    desc: "Golden crispy pastry crust packed with savory spiced filling. Crunchy and hot on delivery.",
    pricePrefix: "",
    priceKey: "sambusaPrice",
    defaultPrice: 30,
  },
  {
    id: "donut",
    name: "Donut",
    category: "snacks",
    badge: "Sweet Treat",
    emoji: "🍩",
    desc: "Fresh, soft glazed sweet doughnuts sold in 1-pair (2 pcs) or 2-pair (4 pcs) packages.",
    pricePrefix: "From",
    priceKey: "donut1PairPackagePrice",
    defaultPrice: 60,
  },
  {
    id: "boiled_egg",
    name: "Boiled Egg",
    category: "snacks",
    badge: "Protein Boost",
    emoji: "🥚",
    desc: "Freshly boiled nutritious egg, perfect quick energy and protein add-on for your meals.",
    pricePrefix: "",
    priceKey: "boiledEggPrice",
    defaultPrice: 30,
  },
];

export default function Menu({ user: propUser, availability: propAvailability, serverOffsetMs: propOffset = 0 }) {
  const [user, setUser] = useState(propUser || null);
  const [message, setMessage] = useState("");
  const [serviceAvailable, setServiceAvailable] = useState(true);
  const [toast, setToast] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const navigate = useNavigate();

  const [serverOffsetMs, setServerOffsetMs] = useState(propOffset);
  const [formattedCutoff, setFormattedCutoff] = useState("");
  const [itemAvailability, setItemAvailability] = useState(DEFAULT_ITEM_AVAILABILITY);
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

  // Fetch user if not provided in props
  useEffect(() => {
    if (propUser) {
      setUser(propUser);
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) return;

    API.get("/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => setUser(res.data))
      .catch(() => setUser(null));
  }, [propUser]);

  const formatCutoffTime = (hour, minute) => {
    const h12 = hour % 12 || 12;
    const ampm = hour >= 12 ? "PM" : "AM";
    const paddedMin = minute.toString().padStart(2, "0");
    return `${h12}:${paddedMin} ${ampm} EAT`;
  };

  const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

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

  const applyAvailabilityState = (availabilityData) => {
    if (!availabilityData) {
      setServiceAvailable(true);
      setMessage(null);
      return;
    }

    const { weeklyDays, cutoffTime, isTemporarilyClosed, tempCloseReason } = availabilityData;

    setItemAvailability({
      ...DEFAULT_ITEM_AVAILABILITY,
      ...(availabilityData.itemAvailability || {}),
    });

    const now = new Date(Date.now() + serverOffsetMs);
    const nowEAT = getEATNowParts(now);

    const withinDays = weeklyDays?.includes(nowEAT.dayStr);
    const [cutHour, cutMinute] = (cutoffTime || "18:00").split(":").map(Number);

    const beforeCutoff =
      nowEAT.hour < cutHour ||
      (nowEAT.hour === cutHour && nowEAT.minute <= cutMinute);

    const cutoffFormatted = formatCutoffTime(cutHour, cutMinute);
    setFormattedCutoff(cutoffFormatted);

    const weekOrder = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const sortedDays = [...(weeklyDays || [])].sort(
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

    if (propAvailability) {
      applyAvailabilityState(propAvailability);
    } else {
      fetchAvailability();
    }

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
  }, [serverOffsetMs, propAvailability]);

  const handleOrderClick = (foodId) => {
    if (itemAvailability[foodId] === false && user?.role !== "admin") {
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

    navigate(`/order?food=${foodId}`);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setToast({ message: "Logged out successfully!", type: "success" });
  };

  const filteredItems = MENU_ITEMS.filter((item) => {
    if (activeFilter === "all") return true;
    return item.category === activeFilter;
  });

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

      {/* Sticky Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-gray-700 hover:text-amber-600 py-1.5 px-2.5 rounded-xl hover:bg-amber-50 transition"
              title="Return to Home page"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Home</span>
            </Link>

            <div className="h-4 w-px bg-gray-200 hidden sm:block" />

            <Link to="/" className="flex items-center gap-2 group">
              <span className="text-xl sm:text-2xl">🍲</span>
              <div className="flex flex-col">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-gray-950 group-hover:text-amber-600 transition">
                  Fetan Delivery
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 leading-none">
                  AASTU Campus
                </span>
              </div>
            </Link>
          </div>

          {/* Right Header Navigation */}
          <div className="flex items-center gap-2 sm:gap-3">
            {roleLower === "admin" && (
              <Link
                to="/admin"
                className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition flex items-center gap-1"
              >
                <span>Dashboard</span>
              </Link>
            )}

            <NotificationBell />

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
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 pt-6 sm:pt-8 pb-16 space-y-8">
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

        {/* Page Hero / Heading */}
        <section className="text-center max-w-2xl mx-auto space-y-3">
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

          <h1 className="text-3xl sm:text-4xl font-black text-gray-950 tracking-tight">
            Today's Campus Menu
          </h1>

          <p className="text-sm sm:text-base text-gray-600 font-medium max-w-md mx-auto">
            Freshly prepared food from Leyla's Tuludimtu kitchen. Tap any item to customize and place your dorm delivery order.
          </p>

          {/* Filter Pills */}
          <div className="pt-2 flex items-center justify-center gap-2">
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                activeFilter === "all"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              All Items ({MENU_ITEMS.length})
            </button>
            <button
              onClick={() => setActiveFilter("mains")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                activeFilter === "mains"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              Main Meals (2)
            </button>
            <button
              onClick={() => setActiveFilter("snacks")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                activeFilter === "snacks"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              Snacks & Treats (3)
            </button>
          </div>
        </section>

        {/* Menu Items Showcase Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredItems.map((item) => {
            const isAvailable = itemAvailability[item.id] !== false;
            const price = pricing[item.priceKey] || item.defaultPrice;

            return (
              <div
                key={item.id}
                className={`bg-white rounded-3xl border transition-all p-5 flex flex-col justify-between group shadow-xs ${
                  isAvailable
                    ? "border-gray-200 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-100 hover:-translate-y-1"
                    : "border-gray-200 opacity-60 bg-gray-50/50"
                }`}
              >
                <div>
                  {/* Top card row: Emoji + Badges */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="w-16 h-16 rounded-2xl bg-amber-50 group-hover:bg-amber-100/80 text-4xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-xs shrink-0">
                      {item.emoji}
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0 ${
                          isAvailable
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                            : "bg-rose-50 text-rose-800 border border-rose-300"
                        }`}
                      >
                        {isAvailable ? "Available" : "Sold Out"}
                      </span>

                      {item.badge && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-black text-lg text-gray-950 group-hover:text-amber-700 transition">
                    {item.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1.5 leading-relaxed font-medium">
                    {item.desc}
                  </p>
                </div>

                {/* Bottom Row: Price & Action */}
                <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-semibold text-gray-500 block">
                      Price
                    </span>
                    <span className="text-base sm:text-lg font-black text-amber-950">
                      {item.pricePrefix ? `${item.pricePrefix} ` : ""}
                      {price}{" "}
                      <span className="text-xs text-amber-800 font-bold">
                        Birr
                      </span>
                    </span>
                  </div>

                  <button
                    onClick={() => handleOrderClick(item.id)}
                    disabled={!isAvailable && user?.role !== "admin"}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                      isAvailable || user?.role === "admin"
                        ? "bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white shadow-amber-200/60 active:scale-95"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                    }`}
                  >
                    <span>{isAvailable ? "Order Now" : "Sold Out"}</span>
                    {isAvailable && <ArrowRight className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </section>

        {/* Quick Order Banner */}
        <section className="bg-linear-to-r from-amber-500 to-orange-600 rounded-3xl p-6 sm:p-8 text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-lg sm:text-xl font-black">
              Ready to place your dorm delivery order?
            </h3>
            <p className="text-xs sm:text-sm text-amber-100 font-medium">
              Customize multiple items, select your dorm block, and track delivery in real time.
            </p>
          </div>

          <button
            onClick={() => {
              if (!serviceAvailable && user?.role !== "admin") {
                setToast({
                  message: "⚠️ Ordering is currently not available.",
                  type: "error",
                });
                return;
              }
              navigate("/order");
            }}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white text-gray-950 font-extrabold text-sm hover:bg-amber-50 transition shadow-xs active:scale-98 flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Utensils className="w-4 h-4 text-amber-600" />
            <span>Go to Order Form</span>
            <ArrowRight className="w-4 h-4 text-amber-600" />
          </button>
        </section>
      </main>

      {/* Footer */}
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
    </div>
  );
}
