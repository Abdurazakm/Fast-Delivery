import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Clock,
  ChefHat,
  Bike,
  PackageCheck,
  Check,
  CheckCircle2,
  AlertCircle,
  XCircle,
  X,
  Copy,
  Share2,
  ExternalLink,
  Edit3,
  Trash2,
  Info,
  ChevronDown,
  User,
  MapPin,
  Calendar,
  Receipt,
} from "lucide-react";
import API from "../api";
import { motion, AnimatePresence } from "framer-motion";
import PaymentInstructionsCard from "../components/PaymentInstructionsCard";
import { maskTrackingCode } from "../notificationStore";

// Toast component for instant feedback
function Toast({ message, type = "success", onClose, duration = 3000 }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const colors = {
    success: "bg-emerald-600 text-white shadow-emerald-200",
    error: "bg-rose-600 text-white shadow-rose-200",
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.25 }}
        className={`fixed top-5 right-4 left-4 sm:left-auto sm:right-5 max-w-[calc(100vw-2rem)] sm:max-w-md px-4 py-3 rounded-2xl shadow-xl ${colors[type] || colors.success} z-50 flex items-center justify-between gap-3`}
      >
        <span className="text-xs sm:text-sm font-medium break-words leading-tight">
          {message}
        </span>
        <button
          onClick={onClose}
          className="shrink-0 p-1 rounded-full hover:bg-white/20 transition cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

// Cancel Confirmation Modal with 'cancel' text safety
function CancelModal({ onConfirm, onCancel }) {
  const [inputValue, setInputValue] = useState("");
  const [shake, setShake] = useState(false);

  const handleConfirm = () => {
    if (inputValue.trim().toLowerCase() === "cancel") onConfirm();
    else {
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  const isReadyToConfirm = inputValue.trim().toLowerCase() === "cancel";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex justify-center items-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full text-center border border-gray-100"
      >
        <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h3 className="font-black text-xl text-gray-950 mb-1">
          Cancel Your Order?
        </h3>
        <p className="text-xs sm:text-sm text-gray-700 font-medium mb-4 leading-relaxed">
          This action <span className="font-bold text-rose-600">cannot be undone</span>.
          To confirm cancellation, please type{" "}
          <span className="font-bold font-mono px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
            cancel
          </span>{" "}
          below.
        </p>

        <div className="relative w-full mb-4">
          <motion.input
            type="text"
            placeholder="Type 'cancel' to confirm"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            animate={shake ? { x: [-6, 6, -6, 6, 0] } : { x: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full px-4 py-3 min-h-[48px] border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-400 text-center text-base font-bold text-gray-950 transition"
            autoFocus
          />
          {isReadyToConfirm && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-600">
              <Check className="w-5 h-5" />
            </div>
          )}
        </div>

        <div className="flex gap-2.5">
          <button
            onClick={onCancel}
            className="flex-1 min-h-[46px] px-4 py-3 bg-white hover:bg-gray-100 active:bg-gray-200 text-gray-900 border-2 border-gray-200 text-xs sm:text-sm font-extrabold rounded-xl transition cursor-pointer"
          >
            Keep Order
          </button>
          <motion.button
            onClick={handleConfirm}
            disabled={!isReadyToConfirm}
            animate={isReadyToConfirm ? { scale: [1, 1.02, 1] } : { scale: 1 }}
            transition={{
              duration: 0.5,
              repeat: isReadyToConfirm ? Infinity : 0,
            }}
            className={`flex-1 min-h-[46px] flex items-center justify-center gap-1.5 px-4 py-3 text-xs sm:text-sm font-extrabold rounded-xl transition cursor-pointer ${
              isReadyToConfirm
                ? "bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-md shadow-rose-200"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            <Trash2 className="w-4 h-4" /> Confirm Cancel
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

export default function TrackingInfoCard({
  order,
  hideCustomerWhenManual = false,
  isDedicatedPage = false,
}) {
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(order);
  const [isTemporarilyClosed, setIsTemporarilyClosed] = useState(false);
  const [serviceDays, setServiceDays] = useState([]);
  const [cutoffHour, setCutoffHour] = useState(18);
  const [cutoffTime, setCutoffTime] = useState("18:00");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const statusSteps = [
    { key: "pending", label: "Received", desc: "Order confirmed", icon: Clock },
    { key: "in_progress", label: "Preparing", desc: "In kitchen", icon: ChefHat },
    { key: "arrived", label: "On The Way", desc: "Rider dispatched", icon: Bike },
    { key: "delivered", label: "Delivered", desc: "At your door", icon: PackageCheck },
  ];

  const currentStatus = (currentOrder?.status || "pending").toLowerCase();
  const currentIndex = statusSteps.findIndex((s) => s.key === currentStatus);
  const isCanceled = currentStatus === "canceled" || currentStatus === "no_show";

  const isManual =
    (currentOrder?.source || "").toString().trim().toLowerCase() === "manual";
  const paymentStatus = (currentOrder?.paymentStatus || "unpaid")
    .toString()
    .toLowerCase();

  const statusConfig = {
    pending: {
      label: "Order Received",
      headline: "Order received & confirmed",
      subtext: "We've accepted your order and sent it to the kitchen queue.",
      accentBg: "bg-amber-500",
      pillBg: "bg-amber-100 text-amber-800 border-amber-200",
      gradient: "from-amber-500/10 via-amber-500/5 to-transparent",
      icon: Clock,
    },
    in_progress: {
      label: "Preparing Food",
      headline: "Kitchen is preparing your order",
      subtext: "Your delicious food is being freshly made with care.",
      accentBg: "bg-orange-500",
      pillBg: "bg-orange-100 text-orange-800 border-orange-200",
      gradient: "from-orange-500/10 via-orange-500/5 to-transparent",
      icon: ChefHat,
    },
    arrived: {
      label: "On The Way",
      headline: "Your order is on the way!",
      subtext: "Our delivery rider is en route to your specified location.",
      accentBg: "bg-sky-500",
      pillBg: "bg-sky-100 text-sky-800 border-sky-200",
      gradient: "from-sky-500/10 via-sky-500/5 to-transparent",
      icon: Bike,
    },
    delivered: {
      label: "Delivered",
      headline: "Delivered! Enjoy your meal 🎉",
      subtext: "Thank you for choosing Ertib Delivery. We hope you love it!",
      accentBg: "bg-emerald-500",
      pillBg: "bg-emerald-100 text-emerald-800 border-emerald-200",
      gradient: "from-emerald-500/10 via-emerald-500/5 to-transparent",
      icon: PackageCheck,
    },
    canceled: {
      label: "Canceled",
      headline: "Order was canceled",
      subtext: "This order has been canceled and will not be prepared.",
      accentBg: "bg-rose-500",
      pillBg: "bg-rose-100 text-rose-800 border-rose-200",
      gradient: "from-rose-500/10 via-rose-500/5 to-transparent",
      icon: XCircle,
    },
  };

  const activeConfig = statusConfig[currentStatus] || statusConfig.pending;

  const getUnitPrice = (item) => {
    if (typeof item?.unitPrice === "number") return item.unitPrice;
    if (item?.foodType === "sambusa") return 30;
    if (item?.foodType === "boiled_egg") return 30;

    if (item?.foodType === "fetira") {
      const extraEggs = Math.max(0, Number(item?.extraEggs) || 0);
      return 120 + extraEggs * 30;
    }

    if (item?.foodType === "donut") {
      const pairs = Number(item?.donutPairsPerPackage) || 1;
      if (pairs === 1) return 60;
      if (pairs === 2) return 120;
      if (pairs === 4) return 220;
      if (pairs === 6) return 320;
      return pairs * 60;
    }

    let price = item?.ertibType === "special" ? 135 : 110;
    if (item?.extraKetchup) price += 10;
    if (item?.extraFelafil || item?.doubleFelafil) price += 15;
    return price;
  };

  const getItemLineTotal = (item) => {
    const qty = Number(item?.quantity) || 1;
    const lineTotal = Number(item?.lineTotal);
    if (Number.isFinite(lineTotal)) return lineTotal;
    return getUnitPrice(item) * qty;
  };

  const getItemDetails = (item) => {
    let name = "";
    const tags = [];

    if (item.foodType === "sambusa") {
      name = "Sambusa";
    } else if (item.foodType === "boiled_egg") {
      name = "Boiled Egg";
    } else if (item.foodType === "fetira") {
      name = "Fetira";
      const extraEggs = Math.max(0, Number(item.extraEggs) || 0);
      if (extraEggs > 0) {
        tags.push(`+${extraEggs} extra egg${extraEggs > 1 ? "s" : ""}`);
      }
    } else if (item.foodType === "donut") {
      name = "Donut Package";
      const pairs = Number(item.donutPairsPerPackage) || 1;
      tags.push(`${pairs} pair${pairs > 1 ? "s" : ""} (${pairs * 2} donuts)`);
    } else {
      const type = item.ertibType === "special" ? "Special Ertib" : "Normal Ertib";
      name = type;

      if (item.spices && item.ketchup) tags.push("Spices & Ketchup");
      else if (item.spices && !item.ketchup) tags.push("Only Spices");
      else if (!item.spices && item.ketchup) tags.push("Only Ketchup");
      else if (!item.spices && !item.ketchup) tags.push("No Spices & Ketchup");

      if (item.extraKetchup) tags.push("+ Extra Ketchup");
      if (item.doubleFelafil || item.extraFelafil) tags.push("+ Double Felafil");
      else if (item.Felafil === false) tags.push("No Felafil");
    }

    return { name, tags };
  };

  const totalPrice =
    currentOrder.total ??
    (currentOrder.items || []).reduce((sum, item) => {
      return sum + getItemLineTotal(item);
    }, 0);

  useEffect(() => {
    setCurrentOrder(order);
  }, [order]);

  // Fetch availability to calculate cutoff and estimated delivery
  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const res = await API.get("/availability");
        const data = res.data;
        const dayMap = {
          Sun: 0,
          Mon: 1,
          Tue: 2,
          Wed: 3,
          Thu: 4,
          Fri: 5,
          Sat: 6,
        };
        setServiceDays((data.weeklyDays || []).map((d) => dayMap[d]));
        if (data.cutoffTime) {
          setCutoffTime(data.cutoffTime);
          setCutoffHour(Number(data.cutoffTime.split(":")[0]));
        }
        setIsTemporarilyClosed(Boolean(data.isTemporarilyClosed));
      } catch (err) {
        console.error("Failed to fetch availability:", err);
      }
    };
    fetchAvailability();
  }, []);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsAdmin(false);
        return;
      }
      try {
        const res = await API.get("/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setIsAdmin(res.data?.role === "admin");
      } catch {
        setIsAdmin(false);
      }
    };
    fetchCurrentUser();
  }, []);

  const now = new Date();
  const today = now.getDay();

  const isBeforeCutoff = () => {
    if (isTemporarilyClosed) return false;
    if (serviceDays.length > 0 && !serviceDays.includes(today)) return false;

    const hrs = now.getHours();
    const mins = now.getMinutes();
    return !(hrs > cutoffHour || (hrs === cutoffHour && mins > 0));
  };

  const isOrderActive = currentStatus !== "delivered" && !isCanceled;
  const canEdit = isOrderActive && (isAdmin || isBeforeCutoff());
  const canCancel = isOrderActive && (isAdmin || isBeforeCutoff());

  const getEstimatedDeliveryString = () => {
    if (!cutoffTime) return null;
    const [cHour, cMinute] = cutoffTime.split(":").map(Number);
    if (Number.isNaN(cHour)) return null;

    const formatHour = (h, m) => {
      const ampm = h >= 12 ? "PM" : "AM";
      const displayH = h % 12 || 12;
      const displayM = m.toString().padStart(2, "0");
      return `${displayH}:${displayM} ${ampm}`;
    };

    const startH = (cHour + 1) % 24;
    const endH = (cHour + 2) % 24;
    return `${formatHour(startH, cMinute || 0)} – ${formatHour(endH, cMinute || 0)}`;
  };

  const handleCopyCode = async () => {
    if (!currentOrder.trackingCode) return;
    try {
      await navigator.clipboard.writeText(currentOrder.trackingCode);
      setCopiedCode(true);
      setToast({
        message: "Full tracking code copied to clipboard!",
        type: "success",
      });
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      setToast({ message: "Failed to copy code.", type: "error" });
    }
  };

  const handleEdit = () => {
    if (!canEdit) {
      setToast({
        message: isTemporarilyClosed
          ? "Service is temporarily closed"
          : "Editing is only allowed before cutoff",
        type: "error",
      });
      return;
    }
    navigate(`/order?edit=${encodeURIComponent(currentOrder.trackingCode)}`);
  };

  const handleCancel = async () => {
    setShowCancelModal(false);
    try {
      await API.delete(`/orders/track/${currentOrder.trackingCode}`);
      setToast({
        message: "✅ Order cancelled successfully!",
        type: "success",
      });
      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      setToast({
        message: err.response?.data?.message || "Failed to cancel order",
        type: "error",
      });
    }
  };

  const estimatedDelivery = getEstimatedDeliveryString();
  const HeroIcon = activeConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden"
    >
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>

      {/* Cancel Confirmation Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <CancelModal
            onConfirm={handleCancel}
            onCancel={() => setShowCancelModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Hero Header Banner */}
      <div
        className={`relative p-5 sm:p-7 bg-linear-to-b ${activeConfig.gradient} border-b border-gray-100`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Status Badge */}
          <div className="flex items-center gap-2.5">
            <div
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl ${activeConfig.accentBg} text-white flex items-center justify-center shadow-md`}
            >
              <HeroIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${activeConfig.pillBg}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  {activeConfig.label}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mt-0.5 leading-snug">
                {activeConfig.headline}
              </h2>
            </div>
          </div>

          {/* Estimated Delivery Window Pill */}
          {estimatedDelivery && !isCanceled && currentStatus !== "delivered" && (
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-gray-200/80 shadow-xs self-start sm:self-auto">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <div className="text-left">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 leading-none">
                  Estimated Delivery
                </p>
                <p className="text-xs sm:text-sm font-bold text-gray-900 mt-0.5 leading-none">
                  {estimatedDelivery}
                </p>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs sm:text-sm text-gray-600 mt-3 max-w-xl">
          {activeConfig.subtext}
        </p>

        {/* 4-Stage Stepper (Only active for non-canceled orders) */}
        {!isCanceled && (
          <div className="mt-6 pt-5 border-t border-gray-200/60">
            <div className="relative flex items-center justify-between w-full">
              {/* Background connecting track */}
              <div className="absolute top-5 sm:top-6 left-6 right-6 h-1 bg-gray-200 -z-0" />

              {/* Dynamic filled track */}
              <div
                className="absolute top-5 sm:top-6 left-6 h-1 bg-linear-to-r from-amber-500 to-emerald-500 transition-all duration-700 -z-0"
                style={{
                  width:
                    currentIndex <= 0
                      ? "0%"
                      : `${(currentIndex / (statusSteps.length - 1)) * 100}%`,
                  maxWidth: "calc(100% - 3rem)",
                }}
              />

              {/* Step Nodes */}
              {statusSteps.map((step, idx) => {
                const isCompleted = idx < currentIndex;
                const isCurrent = idx === currentIndex;
                const StepIcon = isCompleted ? Check : step.icon;

                return (
                  <div
                    key={step.key}
                    className="flex flex-col items-center text-center z-10 flex-1 px-1"
                  >
                    <div
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isCompleted
                          ? "bg-emerald-500 text-white shadow-md shadow-emerald-200"
                          : isCurrent
                            ? "bg-amber-500 text-white ring-4 ring-amber-100 shadow-lg scale-105"
                            : "bg-white text-gray-500 border-2 border-gray-300"
                      }`}
                    >
                      <StepIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <span
                      className={`mt-2 text-xs sm:text-sm transition-colors ${
                        isCompleted
                          ? "text-emerald-800 font-bold"
                          : isCurrent
                            ? "text-amber-900 font-extrabold"
                            : "text-gray-600 font-semibold"
                      }`}
                    >
                      {step.label}
                    </span>
                    <span className="hidden sm:block text-xs text-gray-600 mt-0.5 leading-tight font-medium">
                      {step.desc}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="p-5 sm:p-7 space-y-5">
        {/* Order Details Metadata Strip */}
        <div className="rounded-2xl bg-gray-50/80 border border-gray-100 p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
            {/* Tracking Code with Mask & Copy */}
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                <Receipt className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-extrabold text-gray-700 uppercase tracking-wider block">
                  Tracking Code
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono text-base font-black text-gray-950 truncate">
                    {maskTrackingCode(currentOrder.trackingCode)}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="p-1 rounded-md text-gray-500 hover:text-amber-700 hover:bg-amber-50 transition cursor-pointer"
                    title="Copy full tracking code"
                  >
                    {copiedCode ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Customer Name */}
            {(!isManual || !hideCustomerWhenManual) && currentOrder.customerName && (
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <User className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-extrabold text-gray-700 uppercase tracking-wider block">
                    Recipient
                  </span>
                  <p className="font-bold text-gray-950 truncate mt-0.5 text-sm">
                    {currentOrder.customerName}
                  </p>
                </div>
              </div>
            )}

            {/* Delivery Location */}
            {currentOrder.location && (
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-extrabold text-gray-700 uppercase tracking-wider block">
                    Location
                  </span>
                  <p className="font-bold text-gray-950 truncate mt-0.5 text-sm">
                    {currentOrder.location}
                  </p>
                </div>
              </div>
            )}

            {/* Placed Date & Source */}
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-extrabold text-gray-700 uppercase tracking-wider block">
                  Order Placed
                </span>
                <p className="font-bold text-gray-950 truncate mt-0.5 text-sm">
                  {currentOrder.createdAt
                    ? new Date(currentOrder.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Recently"}{" "}
                  •{" "}
                  <span className="capitalize text-gray-600 font-semibold">
                    {(currentOrder.source || "online").toString().replace("_", " ")}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Itemized Receipt Ticket */}
        {currentOrder.items?.length > 0 && (
          <div className="rounded-2xl border border-gray-100 bg-gray-50/40 p-4 sm:p-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200/80 mb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm sm:text-base font-bold text-gray-900">
                  Order Items ({currentOrder.items.length})
                </h3>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  paymentStatus === "paid"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : "bg-amber-100 text-amber-800 border border-amber-200"
                }`}
              >
                {paymentStatus === "paid"
                  ? "✓ Paid & Confirmed"
                  : "⚠ Payment Pending"}
              </span>
            </div>

            <div className="divide-y divide-gray-100">
              {currentOrder.items.map((item, idx) => {
                const { name, tags } = getItemDetails(item);
                const lineTotal = getItemLineTotal(item);
                const qty = Number(item.quantity) || 1;

                return (
                  <div
                    key={idx}
                    className="py-2.5 flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="shrink-0 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-xs font-bold mt-0.5">
                        {qty}×
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 leading-tight">
                          {name}
                        </p>
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {tags.map((t, tIdx) => (
                              <span
                                key={tIdx}
                                className="inline-block text-[11px] px-1.5 py-0.5 rounded bg-white border border-gray-200 text-gray-600 leading-none"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-gray-900">
                        {lineTotal}{" "}
                        <span className="text-xs font-normal text-gray-500">
                          Birr
                        </span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Receipt Grand Total */}
            <div className="pt-3 mt-3 border-t-2 border-dashed border-gray-200 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-600">
                Total Amount
              </span>
              <div className="text-right">
                <span className="text-lg sm:text-xl font-extrabold text-amber-900">
                  {totalPrice}{" "}
                  <span className="text-xs font-bold text-amber-700">Birr</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Payment Instructions (If unpaid) */}
        {paymentStatus === "unpaid" && !isCanceled && (
          <PaymentInstructionsCard
            amount={totalPrice}
            trackingCode={currentOrder.trackingCode}
            trackingLink={currentOrder.trackUrl}
            onCopy={(copyMessage) =>
              setToast({ message: copyMessage, type: "success" })
            }
          />
        )}

        {/* Cutoff Policy Notice Banner */}
        {isOrderActive && (
          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs sm:text-sm flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Order modification policy: </span>
              {isAdmin
                ? "As admin, you may edit or cancel this order at any time."
                : isTemporarilyClosed
                  ? "Service is temporarily closed. Orders cannot be edited or canceled."
                  : isBeforeCutoff()
                    ? `You can edit or cancel your order before today's cutoff time (${cutoffTime}).`
                    : `Cutoff time (${cutoffTime}) has passed. Modifications are locked as food is currently being prepared.`}
            </div>
          </div>
        )}

        {/* Action Buttons: Edit, Cancel, Full Page Link */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2">
          {/* Edit Order */}
          {isOrderActive && (
            <button
              onClick={handleEdit}
              disabled={!canEdit}
              className={`flex-1 min-w-[130px] min-h-[46px] px-4 py-3 rounded-xl font-extrabold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 cursor-pointer ${
                canEdit
                  ? "bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white shadow-md shadow-amber-200/60 active:scale-98"
                  : "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
              }`}
              title={canEdit ? "Edit order" : "Cannot edit after cutoff"}
            >
              <Edit3 className="w-4 h-4" /> Edit Order
            </button>
          )}

          {/* Cancel Order */}
          {isOrderActive && (
            <button
              onClick={() => {
                if (canCancel) setShowCancelModal(true);
                else
                  setToast({
                    message: isTemporarilyClosed
                      ? "Service is temporarily closed"
                      : "Cancelling is only allowed before cutoff",
                    type: "error",
                  });
              }}
              disabled={!canCancel}
              className={`flex-1 min-w-[130px] min-h-[46px] px-4 py-3 rounded-xl font-extrabold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 cursor-pointer ${
                canCancel
                  ? "bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 border border-rose-300 active:scale-98"
                  : "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
              }`}
              title={canCancel ? "Cancel order" : "Cannot cancel after cutoff"}
            >
              <Trash2 className="w-4 h-4" /> Cancel Order
            </button>
          )}

          {/* If viewed in Homepage, provide button to open Dedicated Tracking Page */}
          {!isDedicatedPage && currentOrder.trackingCode && (
            <Link
              to={`/orders/track/${encodeURIComponent(currentOrder.trackingCode)}`}
              className="w-full sm:w-auto min-h-[46px] px-4 py-3 bg-white hover:bg-gray-100 active:bg-gray-200 text-gray-900 border-2 border-gray-200 text-xs sm:text-sm font-extrabold rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs active:scale-98"
            >
              <span>Dedicated Tracking Page</span>
              <ExternalLink className="w-4 h-4" />
            </Link>
          )}
        </div>

        {/* Collapsible Status Timeline & Activity */}
        <div className="pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setShowTimeline((prev) => !prev)}
            className="w-full flex items-center justify-between py-1 text-left group cursor-pointer focus:outline-none"
            aria-expanded={showTimeline}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-gray-800 group-hover:text-amber-600 transition-colors">
                Status Timeline & Activity
              </span>
              {currentOrder.statusHistory?.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 group-hover:bg-amber-100 group-hover:text-amber-700 transition-colors">
                  {currentOrder.statusHistory.length} update
                  {currentOrder.statusHistory.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400 group-hover:text-amber-600 transition-colors">
              <span>{showTimeline ? "Hide sequence" : "View sequence"}</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  showTimeline ? "rotate-180 text-amber-600" : ""
                }`}
              />
            </div>
          </button>

          {showTimeline && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-3 pt-2"
            >
              {!currentOrder.statusHistory ||
              currentOrder.statusHistory.length === 0 ? (
                <p className="text-xs text-gray-500 italic py-2">
                  No previous status updates recorded yet. Live updates will
                  appear here as your order progresses.
                </p>
              ) : (
                <div className="relative border-l-2 border-gray-200 ml-3.5 space-y-4 my-2">
                  {currentOrder.statusHistory.map((h, hIdx) => {
                    const isCurrent = h.status === currentStatus;
                    const statusTitle =
                      statusConfig[h.status]?.label ||
                      h.status.replace("_", " ");
                    const formattedTime = new Date(h.at).toLocaleTimeString(
                      [],
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    );
                    const formattedDate = new Date(h.at).toLocaleDateString(
                      [],
                      {
                        month: "short",
                        day: "numeric",
                      },
                    );

                    return (
                      <div key={hIdx} className="relative pl-6">
                        <span
                          className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white transition-colors ${
                            isCurrent
                              ? "bg-emerald-500 ring-4 ring-emerald-100"
                              : "bg-gray-300"
                          }`}
                        />
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                          <span
                            className={`text-xs sm:text-sm font-semibold capitalize ${
                              isCurrent
                                ? "text-emerald-700 font-bold"
                                : "text-gray-700"
                            }`}
                          >
                            {statusTitle}
                          </span>
                          <span className="text-[11px] text-gray-400">
                            {formattedDate} at {formattedTime}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
