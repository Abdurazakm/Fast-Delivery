import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Bike,
  Sparkles,
  Plus,
  Minus,
  Trash2,
  User,
  Phone,
  MapPin,
  Receipt,
  AlertCircle,
  X,
  Banknote,
  Smartphone,
  Pencil,
  Zap,
  Copy,
  Check,
  MessageSquare,
} from "lucide-react";
import { FaPaperPlane as FaPaperPlaneIcon } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import Toast from "./Toast";
import API from "../api";
import { getSocket } from "../socket";
import Navbar from "../components/Navbar";
import OrdersMenuWaitingCard from "../components/OrdersMenuWaitingCard";

const DEFAULT_CUSTOMER_NAME = "AASTU Student";
const FETIRA_DEFAULT_EGGS = 3;
const DONUT_PACKAGE_OPTIONS = [1, 2];
const FOOD_TYPE_LABELS = {
  ertib: "Ertib",
  fetira: "Fetira",
  donut: "Donut",
  sambusa: "Sambusa",
  boiled_egg: "Boiled Egg",
};

const DEFAULT_ITEM_AVAILABILITY = {
  ertib: true,
  fetira: true,
  donut: true,
  sambusa: true,
  boiled_egg: true,
};

function buildDefaultItem(foodType = "ertib") {
  if (foodType === "sambusa") {
    return { foodType: "sambusa", quantity: 1 };
  }

  if (foodType === "boiled_egg") {
    return { foodType: "boiled_egg", quantity: 1 };
  }

  if (foodType === "fetira") {
    return {
      foodType: "fetira",
      quantity: 1,
      defaultEggs: FETIRA_DEFAULT_EGGS,
      extraEggs: 0,
    };
  }

  if (foodType === "donut") {
    return {
      foodType: "donut",
      quantity: 1,
      donutPairsPerPackage: 1,
    };
  }

  return {
    foodType: "ertib",
    ertibType: "normal",
    Felafil: true,
    ketchup: true,
    spices: true,
    extraKetchup: false,
    doubleFelafil: false,
    quantity: 1,
  };
}

function getDonutPackageUnitPrice(item, pricing) {
  if (!pricing) return 0;
  const pairs = Number(item?.donutPairsPerPackage) || 1;
  if (pairs === 1) {
    return (
      Number(pricing.donut1PairPackagePrice) ||
      (Number(pricing.donut2PairPackagePrice) || 0) / 2
    );
  }
  if (pairs === 2) return Number(pricing.donut2PairPackagePrice) || 0;
  if (pairs === 4) return Number(pricing.donut4PairPackagePrice) || 0;
  if (pairs === 6) return Number(pricing.donut6PairPackagePrice) || 0;

  const perPairRate =
    Number(pricing.donut1PairPackagePrice) ||
    (Number(pricing.donut2PairPackagePrice) || 0) / 2;
  return Math.max(0, pairs * perPairRate);
}

export function areItemsSameSpec(a, b) {
  if (!a || !b) return false;
  if (a.foodType !== b.foodType) return false;

  if (a.foodType === "ertib") {
    return (
      (a.ertibType || "normal") === (b.ertibType || "normal") &&
      Boolean(a.Felafil !== false) === Boolean(b.Felafil !== false) &&
      Boolean(a.ketchup !== false) === Boolean(b.ketchup !== false) &&
      Boolean(a.spices !== false) === Boolean(b.spices !== false) &&
      Boolean(a.extraKetchup) === Boolean(b.extraKetchup) &&
      Boolean(a.doubleFelafil) === Boolean(b.doubleFelafil)
    );
  }

  if (a.foodType === "fetira") {
    return (Number(a.extraEggs) || 0) === (Number(b.extraEggs) || 0);
  }

  if (a.foodType === "donut") {
    return (
      (Number(a.donutPairsPerPackage) || 1) ===
      (Number(b.donutPairsPerPackage) || 1)
    );
  }

  if (a.foodType === "sambusa" || a.foodType === "boiled_egg") {
    return true;
  }

  return true;
}

// Dialog Box for Admin Successful Order Creation
function OrderSuccessModal({
  order,
  onTrackNow,
  onTakeNextOrder,
  onGoDashboard,
  buildTrackingMessage,
  buildPaymentMessage,
  buildManualOrderSmsMessage,
}) {
  const initialTemplateType =
    order?.initialTemplate ||
    (order?.paymentMethod === "online" &&
    String(order?.paymentStatus || "").toLowerCase() !== "paid"
      ? "payment"
      : "tracking");

  const [selectedTemplate, setSelectedTemplate] = useState(initialTemplateType);

  const getTemplateContent = (type) => {
    if (type === "payment") {
      if (buildPaymentMessage) return buildPaymentMessage(order);
      if (buildManualOrderSmsMessage) return buildManualOrderSmsMessage(order);
    }
    if (buildTrackingMessage) return buildTrackingMessage(order);
    if (buildManualOrderSmsMessage) return buildManualOrderSmsMessage(order);
    return "";
  };

  const [messageText, setMessageText] = useState(() =>
    getTemplateContent(initialTemplateType),
  );
  const [copiedSms, setCopiedSms] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [smsOpened, setSmsOpened] = useState(Boolean(order?.autoSendSms));
  const [smsServerLogged, setSmsServerLogged] = useState(
    Boolean(order?.smsServerLogged),
  );

  // Keep messageText in sync if order changes
  useEffect(() => {
    if (order) {
      const type =
        order?.initialTemplate ||
        (order?.paymentMethod === "online" &&
        String(order?.paymentStatus || "").toLowerCase() !== "paid"
          ? "payment"
          : "tracking");
      setSelectedTemplate(type);
      setMessageText(getTemplateContent(type));
    }
  }, [order]);

  const handleSelectTemplate = (type) => {
    setSelectedTemplate(type);
    setMessageText(getTemplateContent(type));
  };

  const handleResetToCurrentTemplate = () => {
    setMessageText(getTemplateContent(selectedTemplate));
  };

  const handleCopyCode = () => {
    if (order?.trackingCode && navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(order.trackingCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleCopySms = () => {
    const text = messageText || getTemplateContent(selectedTemplate);
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedSms(true);
      setTimeout(() => setCopiedSms(false), 2000);
    }
  };

  const handleSendAppSms = () => {
    if (!order?.customerPhone) return;
    const text = messageText || getTemplateContent(selectedTemplate);
    const isIOS =
      typeof navigator !== "undefined" &&
      /iPad|iPhone|iPod/.test(navigator.userAgent);
    const smsUrl = `sms:${order.customerPhone}${isIOS ? "&" : "?"}body=${encodeURIComponent(text)}`;
    setSmsOpened(true);

    // Tell the server in one click that mobile SMS was sent to customer
    const token = localStorage.getItem("token");
    if (token && (order?.orderId || order?.trackingCode)) {
      API.post(
        "/orders/log-sms",
        {
          orderId: order.orderId,
          trackingCode: order.trackingCode,
          type: selectedTemplate === "payment" ? "payment_reminder" : "confirmation",
          messageText: text,
          recipientPhone: order.customerPhone,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      )
        .then(() => setSmsServerLogged(true))
        .catch((err) =>
          console.error("Failed to log mobile SMS on server:", err),
        );
    }

    // Open mobile messaging app with customer phone & prefilled text
    window.location.href = smsUrl;
  };

  const handleSendTelegram = () => {
    const text = messageText || getTemplateContent(selectedTemplate);
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(order?.trackingLink || "")}&text=${encodeURIComponent(text)}`;
    window.open(tgUrl, "_blank");
  };

  const handleCallCustomer = () => {
    if (!order?.customerPhone) return;
    window.location.href = `tel:${order.customerPhone}`;
  };

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-dialog-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm pointer-events-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full p-4 sm:p-6 text-left border border-gray-100 overflow-hidden max-h-[92vh] overflow-y-auto"
      >
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-linear-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-100">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 id="order-dialog-title" className="text-lg sm:text-xl font-black text-gray-950 tracking-tight">
                Order Created Successfully! 🎉
              </h2>
              <p className="text-xs text-gray-600 font-medium mt-0.5">
                Order is queued in the kitchen. Customer details and message ready below.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onTakeNextOrder}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition shrink-0 cursor-pointer"
            aria-label="Close dialog"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Specific Order & Customer Summary Card */}
        <div className="mt-3.5 p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-amber-200/60">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                Tracking Code
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="font-mono text-base font-black text-gray-950">
                  {order?.trackingCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="p-1 rounded-md text-gray-500 hover:text-gray-900 hover:bg-amber-100 transition cursor-pointer"
                  title="Copy Tracking Code"
                >
                  {copiedCode ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                Total Amount
              </span>
              <span className="text-base font-black text-amber-950 mt-0.5 block">
                {order.total} <span className="text-xs text-amber-800 font-bold">Birr</span>
                <span className="text-[10px] text-gray-500 font-medium ml-1">
                  ({order.paymentMethod === "cod" ? "Cash on Delivery" : "Online"})
                </span>
              </span>
            </div>
          </div>

          {/* Customer Meta Details */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                Customer Name
              </span>
              <span className="font-extrabold text-gray-900 truncate block mt-0.5">
                {order.customerName || "AASTU Student"}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                Customer Phone
              </span>
              <span className="font-mono font-black text-blue-900 block mt-0.5">
                {order.customerPhone}
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                Dorm / Location
              </span>
              <span className="font-extrabold text-gray-900 truncate block mt-0.5">
                {order.customerLocation || "AASTU Campus"}
              </span>
            </div>
          </div>
        </div>

        {/* READY TO SEND MESSAGE BOX (Dedicated to specific customer) */}
        {order.customerPhone && (
          <div className="mt-3.5 bg-blue-50/70 border border-blue-200/90 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-xs font-black uppercase tracking-wider text-blue-950">
                  Ready to Send Message
                </span>
              </div>
              <span className="text-[11px] font-mono font-bold text-blue-900 bg-blue-100/90 px-2 py-0.5 rounded-lg">
                To: {order.customerPhone}
              </span>
            </div>

            {/* Template Selector Tabs (Tracking SMS vs Payment SMS from AdminDashboard) */}
            <div className="flex items-center gap-1.5 p-1 bg-blue-100/70 rounded-xl">
              <button
                type="button"
                onClick={() => handleSelectTemplate("tracking")}
                className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  selectedTemplate === "tracking"
                    ? "bg-white text-blue-900 shadow-xs"
                    : "text-blue-700 hover:text-blue-900"
                }`}
              >
                <span>🚚 Tracking SMS</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectTemplate("payment")}
                className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  selectedTemplate === "payment"
                    ? "bg-white text-blue-900 shadow-xs"
                    : "text-blue-700 hover:text-blue-900"
                }`}
              >
                <span>💳 Payment SMS</span>
              </button>
            </div>

            <p className="text-[11px] text-blue-800 font-medium leading-relaxed">
              Message generated for <span className="font-bold">{order.customerName || "customer"}</span> ({selectedTemplate === "payment" ? "Payment Required" : "Order Confirmation"} template). Review or edit before sending:
            </p>

            {/* Editable Message Box */}
            <div className="relative">
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={4}
                className="w-full p-2.5 rounded-xl border border-blue-200 bg-white text-xs font-mono text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 leading-relaxed resize-none shadow-2xs"
                placeholder="Type SMS message..."
              />
              <div className="flex items-center justify-between mt-1 text-[10px] text-gray-500 font-medium">
                <span>{messageText.length} characters</span>
                <button
                  type="button"
                  onClick={handleResetToCurrentTemplate}
                  className="text-blue-600 hover:underline font-bold cursor-pointer"
                >
                  Reset to {selectedTemplate === "payment" ? "payment" : "tracking"} template
                </button>
              </div>
            </div>

            {/* PRIMARY SEND BUTTON FOR SPECIFIC CUSTOMER */}
            <button
              type="button"
              onClick={handleSendAppSms}
              className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:bg-blue-800 text-white font-black text-xs sm:text-sm shadow-md shadow-blue-200 transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <FaPaperPlaneIcon className="text-xs" />
              <span>📱 Open Mobile SMS App & Send ({order.customerPhone})</span>
            </button>

            {/* Visual confirmation when SMS app is opened */}
            {smsOpened && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-900 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold block text-emerald-950">
                    Opened in your mobile messaging app!
                  </span>
                  <span className="text-[11px] text-emerald-800 font-medium">
                    {smsServerLogged
                      ? `Server recorded that SMS was sent to ${order.customerPhone}.`
                      : "Tap 'Send' in your mobile Messages app to dispatch to customer."}
                  </span>
                </div>
              </div>
            )}

            {/* Extra Fast Actions: Copy Text, Telegram, Call Customer */}
            <div className="grid grid-cols-3 gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={handleCopySms}
                className="min-h-[38px] py-1.5 px-2 rounded-xl bg-white hover:bg-gray-100 border border-gray-200 text-gray-800 text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                title="Copy message to clipboard"
              >
                <span>{copiedSms ? "Copied! ✅" : "📋 Copy Text"}</span>
              </button>

              <button
                type="button"
                onClick={handleSendTelegram}
                className="min-h-[38px] py-1.5 px-2 rounded-xl bg-white hover:bg-sky-50 border border-sky-200 text-sky-800 text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                title="Share directly via Telegram"
              >
                <span>✈️ Telegram</span>
              </button>

              <button
                type="button"
                onClick={handleCallCustomer}
                className="min-h-[38px] py-1.5 px-2 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                title="Call customer directly"
              >
                <span>📞 Call</span>
              </button>
            </div>
          </div>
        )}

        {/* DIALOG ACTION BUTTONS: ADD NEW ORDER AND GO TO DASHBOARD */}
        <div className="mt-4 pt-3.5 border-t border-gray-100 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onTakeNextOrder}
              className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-amber-200 active:scale-98"
            >
              <span>➕ Add New Order</span>
            </button>

            <button
              type="button"
              onClick={onGoDashboard}
              className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-gray-900 hover:bg-black active:scale-98 text-white text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <span>📊 Go to Dashboard</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => onTrackNow(order?.trackingCode)}
            className="w-full min-h-[36px] py-1 text-xs font-bold text-gray-500 hover:text-amber-800 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Bike className="w-3.5 h-3.5" />
            <span>View Customer Tracking Page →</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Order({ user: propUser } = {}) {
  const [customer, setCustomer] = useState({
    customerName: "",
    phone: "",
    location: "",
  });
  const [tracking, setTracking] = useState(null);
  const [orderSuccessModal, setOrderSuccessModal] = useState(null);
  const [user, setUser] = useState(null);
  const storedRole = (typeof window !== "undefined" ? localStorage.getItem("role") || "" : "").toLowerCase();
  const effectiveUser = user || propUser;
  const userRole = (effectiveUser?.role || storedRole || "").toLowerCase();
  const isUserAdmin = ["admin", "employ", "employee", "supleyer"].includes(userRole);
  const [items, setItems] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const foodQuery = params.get("food");
      if (
        foodQuery &&
        ["ertib", "sambusa", "boiled_egg", "fetira", "donut"].includes(
          foodQuery,
        )
      ) {
        return [buildDefaultItem(foodQuery)];
      }
    }
    return [buildDefaultItem("ertib")];
  });

  const [loading, setLoading] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(null); // null | "sms" | "only"
  const [message, setMessage] = useState("");
  const [pricing, setPricing] = useState(null);
  const [loadingPricing, setLoadingPricing] = useState(true);
  const [itemAvailability, setItemAvailability] = useState(
    DEFAULT_ITEM_AVAILABILITY,
  );
  const [reviewMode, setReviewMode] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editCode, setEditCode] = useState(null);
  const [toast, setToast] = useState(null);
  const [duplicateOrderHint, setDuplicateOrderHint] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("cod"); // default to COD for campus convenience
  const [isEditingDelivery, setIsEditingDelivery] = useState(false);
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [copiedField, setCopiedField] = useState(null);
  const [lastOrderPreset, setLastOrderPreset] = useState(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem("ertib_last_order");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleCopyText = (text, fieldKey) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField(null), 2000);
      setToast({
        type: "success",
        message: `Copied "${text}" to clipboard!`,
      });
    }
  };

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        // Guest user: restore previously used delivery details on this device
        try {
          const savedGuest = localStorage.getItem("ertib_guest_delivery");
          if (savedGuest) {
            const parsed = JSON.parse(savedGuest);
            if (parsed && typeof parsed === "object") {
              setCustomer((prev) => ({
                customerName: parsed.customerName || prev.customerName,
                phone: parsed.phone || prev.phone,
                location: parsed.location || prev.location,
              }));
            }
          }
        } catch (e) {
          console.error("Failed to parse saved guest delivery details:", e);
        }
        return;
      }
      try {
        const res = await API.get("/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const role = (res.data?.role || "").toLowerCase();
        const isAdminOrStaff =
          role === "admin" || role === "employ" || role === "employee" || role === "supleyer";
        setUser(res.data);
        if (!isAdminOrStaff) {
          setCustomer({
            customerName: res.data.name || "",
            phone: res.data.phone || "",
            location: res.data.location || res.data.block || "",
          });
        } else {
          // Admin creates orders for customers: prefill neutral default customer name, keep phone & block empty
          setCustomer({
            customerName: DEFAULT_CUSTOMER_NAME,
            phone: "",
            location: "",
          });
          setIsEditingDelivery(true);
        }
      } catch (err) {
        console.error("Failed to load user:", err);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchAvailabilityAndPricing = async () => {
      try {
        const [availRes, pricingRes] = await Promise.all([
          API.get("/availability"),
          API.get("/orders/pricing"),
        ]);

        if (isMounted) {
          if (availRes.data?.itemAvailability) {
            const avail = availRes.data.itemAvailability;
            setItemAvailability({
              ...DEFAULT_ITEM_AVAILABILITY,
              ...avail,
            });
            setItems((prev) =>
              prev.map((it) => {
                if (avail[it.foodType] === false) {
                  const firstAvail =
                    Object.keys(DEFAULT_ITEM_AVAILABILITY).find(
                      (f) => avail[f] !== false,
                    ) || "ertib";
                  return buildDefaultItem(firstAvail);
                }
                return it;
              }),
            );
          }

          if (pricingRes.data) {
            setPricing(pricingRes.data);
          }
          setLoadingPricing(false);
        }
      } catch (err) {
        console.error("Failed to load availability/pricing:", err);
        if (isMounted) setLoadingPricing(false);
      }
    };

    fetchAvailabilityAndPricing();

    const socket = getSocket();
    const handleAvailabilityUpdated = (payload) => {
      if (!payload?.itemAvailability || !isMounted) return;
      const avail = payload.itemAvailability;
      setItemAvailability({
        ...DEFAULT_ITEM_AVAILABILITY,
        ...avail,
      });
      setItems((prev) =>
        prev.map((it) => {
          if (avail[it.foodType] === false) {
            const firstAvail =
              Object.keys(DEFAULT_ITEM_AVAILABILITY).find(
                (f) => avail[f] !== false,
              ) || "ertib";
            return buildDefaultItem(firstAvail);
          }
          return it;
        }),
      );
    };

    const handlePricingUpdated = (payload) => {
      if (!payload || !isMounted) return;
      setPricing((prev) => ({ ...(prev || {}), ...payload }));
    };

    socket.on("availability:updated", handleAvailabilityUpdated);
    socket.on("pricing:updated", handlePricingUpdated);

    return () => {
      isMounted = false;
      socket.off("availability:updated", handleAvailabilityUpdated);
      socket.off("pricing:updated", handlePricingUpdated);
    };
  }, []);

  // Check URL edit param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get("edit");
    if (!code) return;

    setEditCode(code);
    setEditMode(true);

    const fetchOrderForEdit = async () => {
      try {
        const res = await API.get(`/orders/track/${code}/edit`);
        const order = res.data;

        setCustomer({
          customerName: order.customerName || "",
          phone: order.phone || "",
          location: order.location || "",
        });

        if (order.paymentMethod) {
          setPaymentMethod(order.paymentMethod);
        }

        if (order.items && order.items.length > 0) {
          setItems(
            order.items.map((item) => ({
              foodType: item.foodType || "ertib",
              ertibType: item.ertibType || "normal",
              Felafil: item.Felafil !== false,
              ketchup: item.ketchup !== false,
              spices: item.spices !== false,
              extraKetchup: !!item.extraKetchup,
              doubleFelafil: !!item.doubleFelafil,
              quantity: item.quantity || 1,
              defaultEggs:
                item.foodType === "fetira"
                  ? Number(item.defaultEggs) || FETIRA_DEFAULT_EGGS
                  : undefined,
              extraEggs:
                item.foodType === "fetira"
                  ? Number(item.extraEggs) || 0
                  : undefined,
              donutPairsPerPackage:
                item.foodType === "donut"
                  ? Number(item.donutPairsPerPackage) || 1
                  : undefined,
            })),
          );
        }
        setReviewMode(false);
      } catch (err) {
        console.error("Failed to fetch order for edit:", err);
        setMessage("Could not load order for editing.");
      }
    };

    fetchOrderForEdit();
  }, [location.search]);

  const hasPrefilledDelivery = Boolean(
    !isUserAdmin &&
      customer.customerName?.trim() &&
      customer.phone?.trim() &&
      customer.location?.trim()
  );

  const getUnitPrice = (item) => {
    if (!item || !pricing) return 0;

    if (item.foodType === "sambusa") {
      return Number(pricing.sambusaPrice) || 0;
    }

    if (item.foodType === "boiled_egg") {
      return Number(pricing.boiledEggPrice) || 0;
    }

    if (item.foodType === "fetira") {
      const base = Number(pricing.fetiraBasePrice) || 0;
      const extraEggs = Math.max(0, Number(item.extraEggs) || 0);
      const extraEggPrice = Number(pricing.fetiraExtraEggPrice) || 0;
      return base + extraEggs * extraEggPrice;
    }

    if (item.foodType === "donut") {
      return getDonutPackageUnitPrice(item, pricing);
    }

    let base =
      item.ertibType === "special"
        ? Number(pricing.ertibSpecialPrice) || 0
        : Number(pricing.ertibNormalPrice) || 0;

    if (item.extraKetchup) base += Number(pricing.extraKetchupPrice) || 0;
    if (item.doubleFelafil) base += Number(pricing.doubleFelafilPrice) || 0;

    return base;
  };

  const getBasePriceForFoodType = (foodType) => {
    if (!pricing) return null;
    switch (foodType) {
      case "sambusa":
        return pricing.sambusaPrice;
      case "boiled_egg":
        return pricing.boiledEggPrice;
      case "fetira":
        return pricing.fetiraBasePrice;
      case "donut":
        return pricing.donut1PairPackagePrice;
      case "ertib":
      default:
        return pricing.ertibNormalPrice;
    }
  };

  const handleCustomerChange = (e) => {
    const { name, value } = e.target;
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: false }));
    }
    setCustomer((prev) => {
      const next = { ...prev, [name]: value };
      if (!user) {
        try {
          localStorage.setItem("ertib_guest_delivery", JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  };

  const handleItemChange = (index, e) => {
    const { name, value, type, checked } = e.target;

    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;

        if (name === "foodType") {
          return buildDefaultItem(value);
        }

        if (name === "quantity") {
          return { ...item, quantity: Math.max(1, Number(value) || 1) };
        }

        if (type === "checkbox") {
          return { ...item, [name]: !!checked };
        }

        return { ...item, [name]: value };
      }),
    );
  };

  const updateItemQuantity = (index, delta) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const currentQty = Number(item.quantity) || 1;
        const newQty = Math.max(1, currentQty + delta);
        return { ...item, quantity: newQty };
      }),
    );
  };

  const toggleItemField = (index, fieldName) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        return { ...item, [fieldName]: !item[fieldName] };
      }),
    );
  };

  const handleDoneCustomizing = (targetIdx = activeItemIndex) => {
    if (targetIdx == null) {
      setActiveItemIndex(null);
      return;
    }

    setItems((prev) => {
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const current = prev[targetIdx];

      // Check if another item in cart matches the exact same specifications
      const matchIdx = prev.findIndex(
        (it, idx) => idx !== targetIdx && areItemsSameSpec(it, current),
      );

      if (matchIdx !== -1) {
        const addedQty = Number(current.quantity) || 1;
        const newQty = (Number(prev[matchIdx].quantity) || 1) + addedQty;
        const foodName = FOOD_TYPE_LABELS[current.foodType] || "Item";

        setToast({
          type: "info",
          message: `Same specs: combined into 1 ${foodName} (Quantity: ${newQty})`,
        });

        // Add quantity to matched item, and remove the duplicate entry
        return prev
          .map((it, idx) =>
            idx === matchIdx ? { ...it, quantity: newQty } : it,
          )
          .filter((_, idx) => idx !== targetIdx);
      }

      return prev;
    });

    setActiveItemIndex(null);
  };

  const addItem = (foodType) => {
    const selectable = getSelectableFoodTypes();
    const targetType =
      foodType || (selectable.length > 0 ? selectable[0] : "ertib");
    const isSimpleItem =
      targetType === "sambusa" || targetType === "boiled_egg";

    setItems((prev) => {
      // If simple item already in cart, increment quantity directly
      if (isSimpleItem) {
        const existingIdx = prev.findIndex((it) => it.foodType === targetType);
        if (existingIdx !== -1) {
          return prev.map((it, idx) =>
            idx === existingIdx
              ? { ...it, quantity: (Number(it.quantity) || 1) + 1 }
              : it,
          );
        }
      }
      const next = [...prev, buildDefaultItem(targetType)];
      if (!isSimpleItem) {
        setActiveItemIndex(next.length - 1);
      } else {
        setActiveItemIndex(null);
      }
      return next;
    });

    setShowAddMenu(false);
  };

  const removeItem = (index) => {
    setItems((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) {
        setActiveItemIndex(null);
        setShowAddMenu(true);
        return [];
      }
      setActiveItemIndex((curr) => {
        if (curr === index) return null;
        if (curr > index) return curr - 1;
        return curr;
      });
      return next;
    });
  };

  const getSelectableFoodTypes = () => {
    const allFoodTypes = Object.keys(FOOD_TYPE_LABELS);
    return allFoodTypes.filter(
      (foodType) => itemAvailability[foodType] !== false,
    );
  };

  const describeItem = (item, { includeQuantity = true } = {}) => {
    const qtyPrefix = includeQuantity ? `${item.quantity} × ` : "";

    if (item.foodType === "sambusa") {
      return `${qtyPrefix}Sambusa`;
    }

    if (item.foodType === "boiled_egg") {
      return `${qtyPrefix}Boiled Egg`;
    }

    if (item.foodType === "fetira") {
      const extraEggs = Math.max(0, Number(item.extraEggs) || 0);
      return extraEggs > 0
        ? `${qtyPrefix}Fetira (+${extraEggs} extra egg${extraEggs > 1 ? "s" : ""})`
        : `${qtyPrefix}Fetira (3 eggs)`;
    }

    if (item.foodType === "donut") {
      const pairs = Number(item.donutPairsPerPackage) || 1;
      return `${qtyPrefix}Donut (${pairs} pair${pairs > 1 ? "s" : ""} / ${pairs * 2} donuts)`;
    }

    const typeLabel = item.ertibType === "special" ? "Special" : "Normal";
    const condiments = [];
    if (item.Felafil !== false) condiments.push("Felafil");
    if (item.ketchup !== false) condiments.push("Ketchup");
    if (item.spices !== false) condiments.push("Spices");
    if (item.extraKetchup) condiments.push("+Ex Ketchup");
    if (item.doubleFelafil) condiments.push("+2x Felafil");
    if (item.Felafil === false) condiments.push("No Felafil");

    const condStr = condiments.length > 0 ? condiments.join(", ") : "Plain";
    return `${qtyPrefix}${typeLabel} Ertib (${condStr})`;
  };

  const handleReview = (e) => {
    e.preventDefault();

    // Auto-merge any duplicate items with identical specifications before proceeding
    let currentItems = items;
    const merged = [];
    let didMerge = false;
    for (const it of currentItems) {
      const matchIdx = merged.findIndex((m) => areItemsSameSpec(m, it));
      if (matchIdx !== -1) {
        didMerge = true;
        merged[matchIdx] = {
          ...merged[matchIdx],
          quantity:
            (Number(merged[matchIdx].quantity) || 1) +
            (Number(it.quantity) || 1),
        };
      } else {
        merged.push({ ...it });
      }
    }
    if (didMerge) {
      currentItems = merged;
      setItems(merged);
    }
    setActiveItemIndex(null);

    if (currentItems.length === 0) {
      setMessage("Your cart is empty. Please add at least one item to order.");
      setShowAddMenu(true);
      return;
    }

    const errors = {};
    let finalCustomerName = (customer.customerName || "").trim();
    if (!finalCustomerName) {
      if (isUserAdmin) {
        finalCustomerName = DEFAULT_CUSTOMER_NAME;
        setCustomer((prev) => ({ ...prev, customerName: DEFAULT_CUSTOMER_NAME }));
      } else {
        errors.customerName = true;
      }
    }
    if (!customer.phone?.trim() || customer.phone.trim().length < 9)
      errors.phone = true;
    if (!customer.location?.trim()) errors.location = true;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setIsEditingDelivery(true);
      const firstField = Object.keys(errors)[0];
      const friendlyName =
        firstField === "customerName"
          ? "your name"
          : firstField === "phone"
            ? "a valid phone number"
            : "your AASTU dorm block / room";
      setMessage(`Please provide ${friendlyName} for delivery.`);

      setTimeout(() => {
        const input =
          document.querySelector(`input[name="${firstField}"]`) ||
          document.getElementById("dorm-block-input");
        if (input) {
          input.scrollIntoView({ behavior: "smooth", block: "center" });
          input.focus();
        }
      }, 80);
      return;
    }

    setFieldErrors({});
    setReviewMode(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleConfirmOrder = async ({ forceCreateDuplicate = false, autoSendSms = false } = {}) => {
    if (!isUserAdmin) {
      const unavailableFoodTypes = Array.from(
        new Set(
          items
            .map((item) => item.foodType || "ertib")
            .filter((foodType) => itemAvailability[foodType] === false),
        ),
      );

      if (unavailableFoodTypes.length) {
        setMessage(
          `These items are unavailable: ${unavailableFoodTypes
            .map((foodType) => FOOD_TYPE_LABELS[foodType] || foodType)
            .join(", ")}.`,
        );
        return;
      }
    }

    const actionType = autoSendSms ? "sms" : "only";
    setSubmittingAction(actionType);
    setLoading(true);
    setMessage("");
    setDuplicateOrderHint(null);

    const itemList = items.map((item) => {
      const sanitized = {
        ...item,
        quantity: Number(item.quantity) || 1,
      };
      const unitPrice = getUnitPrice(sanitized);
      const lineTotal = unitPrice * sanitized.quantity;
      return { ...sanitized, unitPrice, lineTotal };
    });

    const total = itemList.reduce((sum, i) => sum + i.lineTotal, 0);
    const fcmToken = localStorage.getItem("fcm_token");
    const effectiveCustomerName =
      (customer.customerName || "").trim() ||
      (isUserAdmin ? DEFAULT_CUSTOMER_NAME : "Guest");

    const payload = {
      ...customer,
      customerName: effectiveCustomerName,
      items: itemList,
      total,
      paymentMethod,
      changeRequested: "exact",
      ...(fcmToken ? { fcmToken } : {}),
      ...(forceCreateDuplicate ? { forceCreateDuplicate: true } : {}),
    };

    try {
      if (editMode && editCode) {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await API.put(`/orders/track/${editCode}`, payload, {
          headers,
        });
        const updated = res.data.order || res.data;
        setMessage("Order updated successfully!");

        setEditMode(false);
        setEditCode(null);
        const targetUrl =
          updated.paymentStatus === "partially_paid" || updated.paymentStatus === "unpaid"
            ? `/track/${encodeURIComponent(updated.trackingCode || editCode)}#payment-card`
            : `/track/${encodeURIComponent(updated.trackingCode || editCode)}`;
        navigate(targetUrl, {
          replace: true,
        });
      } else {
        let endpoint = "/orders";
        const headers = {};

        if (isUserAdmin) {
          endpoint = "/orders/manual";
          const token = localStorage.getItem("token");
          headers.Authorization = `Bearer ${token}`;
        }

        const res = await API.post(endpoint, payload, { headers });
        const orderData = res.data.order || res.data;

        if (!orderData?.trackingCode) {
          throw new Error("Tracking code not returned by server.");
        }

        setMessage("Order placed successfully!");
        const finalTrackingCode = orderData.trackingCode;
        const finalPhone = orderData.phone || customer.phone;

        // Only save to localStorage, bind device FCM token, and join socket rooms for regular customer devices
        if (!isUserAdmin) {
          localStorage.setItem("last_order_tracking", finalTrackingCode);
          localStorage.setItem("last_order_phone", finalPhone);
          if (!user) {
            try {
              localStorage.setItem(
                "ertib_guest_delivery",
                JSON.stringify({
                  customerName: customer.customerName,
                  phone: finalPhone,
                  location: customer.location,
                })
              );
            } catch {}
          }

          try {
            localStorage.setItem(
              "ertib_last_order",
              JSON.stringify({
                items,
                customerName: customer.customerName,
                phone: finalPhone,
                location: customer.location,
                paymentMethod,
              })
            );
          } catch {}

          const socket = getSocket();
          if (socket) {
            socket.emit("join-order", finalTrackingCode);
            socket.emit("join-phone", finalPhone);
          }

          const currentFcmToken = localStorage.getItem("fcm_token");
          if (currentFcmToken) {
            API.post("/notifications/register-token", {
              token: currentFcmToken,
              phone: finalPhone,
              trackingCode: finalTrackingCode,
            }).catch(() => {});
          }
        }

        const storedRole = (typeof window !== "undefined" ? localStorage.getItem("role") || "" : "").toLowerCase();
        const effectiveUser = user || propUser;
        const currentRole = (effectiveUser?.role || storedRole || "").toLowerCase();
        const isAdminOrder =
          isUserAdmin ||
          Boolean(orderData?.createdByAdmin) ||
          orderData?.source === "manual" ||
          Boolean(localStorage.getItem("token") && ["admin", "employ", "employee", "supleyer"].includes(currentRole));

        if (isAdminOrder) {
          const initialTemplate =
            paymentMethod === "online" &&
            String(orderData?.paymentStatus || "").toLowerCase() !== "paid"
              ? "payment"
              : "tracking";

          const orderForTemplate = {
            ...orderData,
            trackingCode: finalTrackingCode,
            trackingLink: orderData.trackUrl,
            paymentStatus: orderData.paymentStatus,
            paymentMethod,
            total: orderData.total ?? total,
            customerName: effectiveCustomerName,
          };

          const smsText =
            initialTemplate === "payment"
              ? buildPaymentMessage(orderForTemplate)
              : buildTrackingMessage(orderForTemplate);

          let smsLogged = false;
          if (autoSendSms && finalPhone) {
            // Tell the server that mobile SMS was sent to customer
            const token = localStorage.getItem("token");
            if (token) {
              API.post(
                "/orders/log-sms",
                {
                  orderId: orderData.id,
                  trackingCode: finalTrackingCode,
                  type: initialTemplate === "payment" ? "payment_reminder" : "confirmation",
                  messageText: smsText,
                  recipientPhone: finalPhone,
                },
                { headers: { Authorization: `Bearer ${token}` } },
              )
                .then(() => {})
                .catch((e) =>
                  console.error("Failed to log mobile SMS on server:", e),
                );
            }

            // Open mobile messaging app with customer phone & prefilled text
            const isIOS =
              typeof navigator !== "undefined" &&
              /iPad|iPhone|iPod/.test(navigator.userAgent);
            const smsUrl = `sms:${finalPhone}${isIOS ? "&" : "?"}body=${encodeURIComponent(smsText)}`;
            setTimeout(() => {
              window.location.href = smsUrl;
            }, 80);
            smsLogged = true;
          }

          const orderSummary = {
            orderId: orderData.id,
            trackingCode: finalTrackingCode,
            trackingLink: orderData.trackUrl,
            createdByAdmin: true,
            customerPhone: finalPhone,
            customerName: effectiveCustomerName,
            customerLocation:
              customer.location || orderData.location || "AASTU Campus",
            autoSendSms,
            smsServerLogged: smsLogged,
            initialTemplate,
            paymentStatus:
              orderData.paymentStatus ||
              (paymentMethod === "cod" ? "pending_cash" : "unpaid"),
            paymentMethod,
            total: orderData.total ?? total,
          };

          setOrderSuccessModal(orderSummary);
          setTracking(orderSummary);

          // Reset form behind modal so admin can immediately take next phone order
          setCustomer({
            customerName: DEFAULT_CUSTOMER_NAME,
            phone: "",
            location: "",
          });
          setItems([buildDefaultItem("ertib")]);
          setActiveItemIndex(0);
          setReviewMode(false);
          setDuplicateOrderHint(null);
          setPaymentMethod("cod");
          setFieldErrors({});
          setIsEditingDelivery(true);
        } else {
          // Regular customer (other user): immediately transition to live tracking page!
          const targetUrl =
            paymentMethod === "online"
              ? `/track/${encodeURIComponent(finalTrackingCode)}?justPlaced=1#payment-card`
              : `/track/${encodeURIComponent(finalTrackingCode)}?justPlaced=1`;
          navigate(targetUrl, {
            replace: true,
          });
          return;
        }
      }
    } catch (err) {
      console.error("Order failed:", err);
      const duplicatePayload = err.response?.data;
      if (
        err.response?.status === 409 &&
        duplicatePayload?.code === "EXISTING_PHONE_ORDER"
      ) {
        setDuplicateOrderHint(duplicatePayload.existingOrder || null);
        setMessage("");
      } else {
        setMessage(
          err.response?.data?.message ||
            err.message ||
            "Failed to place order. Try again.",
        );
      }
    } finally {
      setLoading(false);
      setSubmittingAction(null);
    }
  };

  const handleBack = () => {
    setReviewMode(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleTrackNow = (targetCode = orderSuccessModal?.trackingCode) => {
    const code = targetCode || orderSuccessModal?.trackingCode;
    if (!code) return;
    const targetUrl =
      paymentMethod === "online"
        ? `/track/${encodeURIComponent(code)}?justPlaced=1#payment-card`
        : `/track/${encodeURIComponent(code)}?justPlaced=1`;
    navigate(targetUrl, {
      replace: true,
    });
  };

  // Message templates adopted from AdminDashboard as reference:
  const buildTrackingMessage = (orderObj = orderSuccessModal || tracking) => {
    if (!orderObj) return "";
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://fetandelivery.netlify.app";
    const code = orderObj.trackingCode || orderObj._id || orderObj.id || "--";
    const baseLink = orderObj.trackingLink || `${origin}/track/${code}/`;
    const name = (orderObj.customerName || "").trim();
    const isGeneric = !name || name === "AASTU Student" || name === "Customer";
    const greeting = !isGeneric
      ? `Hello ${name}`
      : orderObj.source === "manual" || orderObj.createdByAdmin
      ? "Hello"
      : `Hello ${name || "Customer"}`;
    const status = String(orderObj.status || "pending").toLowerCase();

    switch (status) {
      case "pending":
        return `${greeting}! Your order (Code: ${code}) is confirmed. Thanks for your request — we’ll notify you once preparation begins. Track your order here: ${baseLink}`;

      case "in_progress":
        return `${greeting}! Good news — your order (Code: ${code}) is now being prepared and will be on its way shortly. Track its progress here: ${baseLink}`;

      case "arrived":
        return `${greeting}! Your order (Code: ${code}) has arrived. Please pick it up from the location you shared around ${
          orderObj.customerLocation || orderObj.location || "your specified address"
        }. Track it here: ${baseLink}`;

      case "delivered":
        return `${greeting}! Your order (Code: ${code}) has been delivered. Thank you for choosing Fetan Delivery! We’d be happy to serve you again — you can place next order during our service hours at https://fetandelivery.netlify.app/. If you have feedback, just reply to this message.`;

      default:
        return `${greeting}! Your order (Code: ${code}) is currently: ${
          orderObj.status || "unknown"
        }. Track it here: ${baseLink}`;
    }
  };

  const buildPaymentMessage = (orderObj = orderSuccessModal || tracking) => {
    if (!orderObj) return "";
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://fetandelivery.netlify.app";
    const code = orderObj.trackingCode || orderObj._id || orderObj.id || "--";
    const baseLink = orderObj.trackingLink || `${origin}/track/${code}/`;
    const name = (orderObj.customerName || "").trim();
    const isGeneric = !name || name === "AASTU Student" || name === "Customer";
    const greeting = !isGeneric
      ? `Hello ${name}`
      : orderObj.source === "manual" || orderObj.createdByAdmin
      ? "Hello"
      : `Hello ${name || "Customer"}`;

    const displayedTotal = Number(
      orderObj.total ?? orderObj.totalPrice ?? orderObj.amount ?? 0,
    );
    const totalBirr = displayedTotal.toFixed(2);
    const payment = String(
      orderObj.paymentStatus ||
        (orderObj.paymentMethod === "cod" ? "pending_cash" : "unpaid"),
    ).toLowerCase();

    if (payment === "paid") {
      if (orderObj.amountPaid && Number(orderObj.amountPaid) > displayedTotal) {
        const refundAmt = (Number(orderObj.amountPaid) - displayedTotal).toFixed(2);
        return `${greeting}! ✅ Your payment for order (Code: ${code}) is confirmed. Since you updated your order, an overpayment refund of ${refundAmt} Birr will be handed to you in cash upon delivery. Track your order here: ${baseLink}`;
      }
      return `${greeting}! ✅ We have received your payment for order (Code: ${code}). Your order is now confirmed and being processed. Track your order here: ${baseLink}`;
    }

    if (payment === "partially_paid") {
      const paidAmt = Number(orderObj.amountPaid || 0).toFixed(2);
      const shortfall = Math.max(0, displayedTotal - Number(orderObj.amountPaid || 0)).toFixed(2);
      return `${greeting}! ⚠️ Please fulfill your remaining payment for order (Code: ${code}).\n\nTotal: ${totalBirr} Birr\nAlready Paid: ${paidAmt} Birr\nRemaining to Fulfill: ${shortfall} Birr\n\nPlease transfer the remaining ${shortfall} Birr and upload your screenshot on your tracking page:\n${baseLink}\n\nAccounts:\n🏦 CBE: 1000528463243\n📱 Telebirr / CBEBirr: 0954724664`;
    }

    return `${greeting}! 💳 Payment is still required for your order (Code: ${code}).\n\nAmount to pay: ${totalBirr} Birr\n\nYour order will NOT be confirmed until payment is completed.\n\nPayment options:\n🏦 CBE: 1000528463243 (Abdurazak Mohammed)\n📱 Telebirr / CBEBirr: 0954724664 (Abdurazak Mohammed)\n\n📸 After payment, upload your screenshot on tracking page:\n${baseLink}\nTelegram: https://t.me/ABDURAZACQ`;
  };

  const buildManualOrderSmsMessage = (orderObj = orderSuccessModal || tracking) => {
    const isOnlineUnpaid =
      orderObj?.paymentMethod === "online" &&
      String(orderObj?.paymentStatus || "").toLowerCase() !== "paid";
    return isOnlineUnpaid
      ? buildPaymentMessage(orderObj)
      : buildTrackingMessage(orderObj);
  };

  const handleResetForNextOrder = () => {
    setCustomer({
      customerName: isUserAdmin ? DEFAULT_CUSTOMER_NAME : "",
      phone: "",
      location: "",
    });
    setItems([buildDefaultItem("ertib")]);
    setActiveItemIndex(0);
    setReviewMode(false);
    setOrderSuccessModal(null);
    setTracking(null);
    setDuplicateOrderHint(null);
    setPaymentMethod("cod");
    setMessage("");
    setFieldErrors({});
    setIsEditingDelivery(true);
    setToast({
      type: "info",
      message: "Ready for next customer order!",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const orderTotal = items.reduce(
    (sum, item) => sum + getUnitPrice(item) * (Number(item.quantity) || 1),
    0,
  );

  const totalItemsCount = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 1),
    0,
  );


  return (
    <div className="min-h-screen bg-gray-50/70 text-gray-900 pb-20 selection:bg-amber-100 selection:text-amber-900">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Role-Aware Order Success Modal (for Admin Phone Orders) */}
      <AnimatePresence>
        {orderSuccessModal && (
          <OrderSuccessModal
            key={orderSuccessModal.trackingCode || "order-success-dialog"}
            order={orderSuccessModal}
            buildTrackingMessage={buildTrackingMessage}
            buildPaymentMessage={buildPaymentMessage}
            buildManualOrderSmsMessage={buildManualOrderSmsMessage}
            onTrackNow={(code) =>
              handleTrackNow(code || orderSuccessModal.trackingCode)
            }
            onTakeNextOrder={handleResetForNextOrder}
            onGoDashboard={() => navigate("/admin")}
          />
        )}
      </AnimatePresence>

      {/* Floating Duplicate Order Notification */}
      <AnimatePresence>
        {duplicateOrderHint?.trackingCode && (
          <motion.div
            initial={{ opacity: 0, y: -24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed top-4 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg z-50 pointer-events-auto"
          >
            <div className="bg-white rounded-2xl border border-amber-300 shadow-2xl p-4 sm:p-5 text-gray-900 space-y-3.5 ring-1 ring-black/10">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 text-amber-700">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-gray-900 leading-tight">
                      Active Order Already Exists
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1 leading-relaxed">
                      A recent active order already exists for this phone number. Edit the previous order instead of creating a new one.
                    </p>
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 text-xs font-medium text-gray-700">
                      <span>Existing Order:</span>
                      <span className="font-mono font-bold text-gray-900">
                        {duplicateOrderHint.trackingCode}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDuplicateOrderHint(null)}
                  className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition shrink-0 cursor-pointer"
                  aria-label="Dismiss alert"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    const code = duplicateOrderHint.trackingCode;
                    setDuplicateOrderHint(null);
                    navigate(`/order?edit=${encodeURIComponent(code)}`);
                  }}
                  className="flex-1 min-w-[150px] py-2.5 px-3.5 rounded-xl bg-gray-900 hover:bg-black active:scale-98 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit Previous Order</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const code = duplicateOrderHint.trackingCode;
                    setDuplicateOrderHint(null);
                    navigate(`/track/${encodeURIComponent(code)}`);
                  }}
                  className="py-2.5 px-3.5 rounded-xl bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-800 font-semibold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                >
                  <span>View Order</span>
                </button>

                {isUserAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setDuplicateOrderHint(null);
                      handleConfirmOrder({ forceCreateDuplicate: true });
                    }}
                    disabled={loading}
                    className="py-2.5 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-bold text-xs transition cursor-pointer"
                  >
                    Create Anyway (Admin)
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Responsive Top Navbar */}
      <Navbar user={user} />

      {/* Sub Header for Order Context */}
      <div className="bg-white/90 backdrop-blur-md border-b border-gray-150 py-2.5 px-4 shadow-2xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          {reviewMode ? (
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-gray-950 transition shrink-0 cursor-pointer active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Edit</span>
            </button>
          ) : (
            <Link
              to="/menu"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 transition shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Menu</span>
            </Link>
          )}

          {/* Campus Delivery Status Badge */}
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-700 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span>AASTU Blocks 1–28</span>
          </div>

          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 hidden sm:inline">
            Kitchen Active
          </span>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-2xl mx-auto px-4 pt-4 sm:pt-6 pb-44 sm:pb-12 space-y-5">
        {/* Admin Operational Mode Banner */}
        {isUserAdmin && (
          <div className="bg-blue-50/90 border border-blue-200 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                Staff
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-xs sm:text-sm font-black text-blue-950">
                    Taking Customer Order
                  </p>
                  <span className="px-2 py-0.2 rounded-full text-[10px] font-extrabold bg-blue-200/80 text-blue-800">
                    Admin Session
                  </span>
                </div>
                <p className="text-[11px] text-blue-700 font-medium truncate sm:whitespace-normal">
                  Details are not saved to your personal account. Each order is logged for that customer.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleResetForNextOrder}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-blue-50 border border-blue-300 text-blue-900 font-bold text-xs transition cursor-pointer active:scale-95 shadow-xs"
              >
                ➕ New Order
              </button>
              <button
                type="button"
                onClick={() => navigate("/admin")}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer active:scale-95 shadow-xs"
              >
                Dashboard →
              </button>
            </div>
          </div>
        )}

        {/* "The Usual" 1-Tap Quick Reorder Card (Customers Only) */}
        {!isUserAdmin &&
          lastOrderPreset &&
          lastOrderPreset.items?.length > 0 &&
          !reviewMode && (
            <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-700">
                  <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                  <span>Reorder The Usual</span>
                </div>
                <p className="font-bold text-sm text-gray-900 truncate">
                  {lastOrderPreset.items.map((it) => describeItem(it)).join(", ")}
                </p>
                {lastOrderPreset.location && (
                  <p className="text-xs text-gray-500 font-medium">
                    Deliver to: <span className="text-gray-800 font-semibold">{lastOrderPreset.location}</span> ({lastOrderPreset.customerName || "You"})
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setItems(lastOrderPreset.items);
                  if (
                    lastOrderPreset.customerName ||
                    lastOrderPreset.phone ||
                    lastOrderPreset.location
                  ) {
                    setCustomer({
                      customerName: lastOrderPreset.customerName || "",
                      phone: lastOrderPreset.phone || "",
                      location: lastOrderPreset.location || "",
                    });
                  }
                  if (lastOrderPreset.paymentMethod) {
                    setPaymentMethod(lastOrderPreset.paymentMethod);
                  }
                  setActiveItemIndex(null);
                  setToast({
                    type: "success",
                    message: "Loaded your usual order! Ready to review.",
                  });
                }}
                className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-black active:scale-95 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Load Usual</span>
              </button>
            </div>
          )}

        {/* Error / Status Alert */}
        {message && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>{message}</div>
            </div>
            <button
              onClick={() => setMessage("")}
              className="text-amber-700 hover:text-amber-900"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ORDER FORM VS REVIEW SCREEN */}
        {loadingPricing && !pricing ? (
          <OrdersMenuWaitingCard />
        ) : !reviewMode ? (
          <form onSubmit={handleReview} className="space-y-5">
            {/* Food Items List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h2 className="font-extrabold text-base text-gray-950 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-amber-600" />
                  <span>Items Ordered ({items.length})</span>
                </h2>
                <span className="text-xs font-semibold text-gray-600">Customize below</span>
              </div>

              {/* Empty Cart Banner */}
              {items.length === 0 && (
                <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-dashed border-amber-200 text-center space-y-2.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-2xs">
                    <Receipt className="w-6 h-6" />
                  </div>
                  <p className="font-extrabold text-sm sm:text-base text-gray-950">
                    Your cart is currently empty
                  </p>
                  <p className="text-xs text-gray-500 font-medium max-w-xs mx-auto">
                    Select a food item below to start your campus order.
                  </p>
                </div>
              )}

              {items.map((item, index) => {
                const unitPrice = getUnitPrice(item);
                const lineTotal = unitPrice * (Number(item.quantity) || 1);
                const isItemExpanded = activeItemIndex === index;

                if (!isItemExpanded) {
                  const summaryText = describeItem(item, {
                    includeQuantity: false,
                  });

                  return (
                    <div
                      key={index}
                      className="bg-white rounded-2xl p-3.5 sm:p-4 border border-gray-200/90 shadow-2xs hover:border-amber-300 transition-all space-y-2"
                    >
                      {/* Top Row: Stepper + Food Name + Price + Actions */}
                      <div className="flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Quick Stepper */}
                          <div className="flex items-center gap-1 bg-gray-100/90 rounded-xl p-0.5 border border-gray-200/80 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                if (item.quantity > 1) {
                                  updateItemQuantity(index, -1);
                                } else {
                                  removeItem(index);
                                }
                              }}
                              className="w-6 h-6 rounded-lg bg-white hover:bg-rose-50 text-gray-700 hover:text-rose-600 flex items-center justify-center text-xs font-black transition cursor-pointer active:scale-90 shadow-2xs"
                              title={
                                item.quantity > 1
                                  ? "Decrease quantity"
                                  : "Remove item"
                              }
                            >
                              {item.quantity > 1 ? (
                                <Minus className="w-3 h-3" />
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                            </button>
                            <span className="text-xs font-black text-gray-950 min-w-[16px] text-center">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateItemQuantity(index, 1)}
                              className="w-6 h-6 rounded-lg bg-white hover:bg-amber-50 text-gray-700 hover:text-amber-800 flex items-center justify-center text-xs font-black transition cursor-pointer active:scale-90 shadow-2xs"
                              title="Increase quantity"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Food Title */}
                          <span className="font-extrabold text-sm sm:text-base text-gray-950 truncate">
                            {FOOD_TYPE_LABELS[item.foodType]}
                          </span>
                        </div>

                        {/* Right: Line total + Edit & Remove actions */}
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                          <span className="font-extrabold text-xs sm:text-sm text-gray-900">
                            {lineTotal} Birr
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              handleDoneCustomizing();
                              setActiveItemIndex(index);
                              setShowAddMenu(false);
                            }}
                            className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold transition flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                            title="Edit item"
                          >
                            <Pencil className="w-3 h-3 text-gray-500" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="w-7 h-7 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Bottom Row: Full Customization Summary Pill */}
                      {summaryText && (
                        <div className="pt-0.5">
                          <span className="text-xs text-gray-700 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-xl font-medium inline-block leading-relaxed break-words">
                            {summaryText}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <div
                    key={index}
                    className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4 relative"
                  >
                    {/* Item Header & Remove/Done */}
                    <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
                        {items.length > 1 ? `Editing Item #${index + 1}` : "Customize Food"}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDoneCustomizing(index)}
                          className="text-xs font-bold text-gray-800 hover:text-gray-950 bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-xl border border-gray-200 transition cursor-pointer flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Done</span>
                        </button>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-xs font-medium text-gray-500 hover:text-rose-600 flex items-center gap-1 transition cursor-pointer py-1 px-2 rounded-lg hover:bg-rose-50"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Multi-item Specification Clarity Banner */}
                    {(() => {
                      const otherSameItems = items.filter(
                        (it, idx) =>
                          idx !== index && it.foodType === item.foodType,
                      );
                      if (otherSameItems.length > 0) {
                        const existingSummary = otherSameItems
                          .map((it) => describeItem(it))
                          .join(", ");
                        return (
                          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 text-gray-800 text-xs space-y-1">
                            <div className="font-bold flex items-center gap-1.5 text-gray-900">
                              <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span className="leading-snug break-words">
                                In Cart: <strong>{existingSummary}</strong>
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-600 font-normal leading-relaxed">
                              Customize this item with <strong>different specifications</strong> below. If specifications match identically, the quantity will combine automatically.
                            </p>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Food Selection Chips */}
                    <div className="flex flex-wrap gap-2">
                      {getSelectableFoodTypes().map((foodType) => {
                        const isSelected = item.foodType === foodType;
                        const basePrice = getBasePriceForFoodType(foodType);

                        return (
                          <button
                            key={foodType}
                            type="button"
                            onClick={() => {
                              if (item.foodType !== foodType) {
                                handleItemChange(index, {
                                  target: { name: "foodType", value: foodType },
                                });
                              }
                            }}
                            className={`px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-extrabold border-2 transition cursor-pointer active:scale-98 flex items-center gap-1.5 ${
                              isSelected
                                ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                                : "bg-white text-gray-800 border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <span>{FOOD_TYPE_LABELS[foodType]}</span>
                            {basePrice != null && (
                              <span
                                className={`text-[11px] font-bold ${
                                  isSelected ? "text-amber-100" : "text-gray-500"
                                }`}
                              >
                                • {basePrice} Birr
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* ERTIB CUSTOMIZATION */}
                    {item.foodType === "ertib" && (
                      <div className="space-y-3 pt-1">
                        {/* Normal vs Special Pills */}
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                            Ertib Type
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleItemChange(index, {
                                  target: { name: "ertibType", value: "normal" },
                                })
                              }
                              className={`py-2.5 sm:py-3 px-3 min-h-[46px] rounded-xl text-xs sm:text-sm font-extrabold border-2 transition cursor-pointer active:scale-98 ${
                                item.ertibType === "normal"
                                  ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                                  : "bg-white text-gray-800 border-gray-200 hover:border-amber-300"
                              }`}
                            >
                              Normal ({pricing?.ertibNormalPrice} Birr)
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleItemChange(index, {
                                  target: { name: "ertibType", value: "special" },
                                })
                              }
                              className={`py-2.5 sm:py-3 px-3 min-h-[46px] rounded-xl text-xs sm:text-sm font-extrabold border-2 transition cursor-pointer active:scale-98 ${
                                item.ertibType === "special"
                                  ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                                  : "bg-white text-gray-800 border-gray-200 hover:border-amber-300"
                              }`}
                            >
                              Special ({pricing?.ertibSpecialPrice} Birr)
                            </button>
                          </div>
                        </div>

                        {/* Quick Condiment Presets (1-Tap Selection) */}
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center justify-between">
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                              Quick Topping Presets
                            </label>
                            <span className="text-[10px] text-gray-500 font-semibold">1-Tap Choice</span>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setItems((prev) =>
                                  prev.map((it, i) =>
                                    i === index
                                      ? {
                                          ...it,
                                          Felafil: true,
                                          ketchup: true,
                                          spices: true,
                                          extraKetchup: false,
                                          doubleFelafil: false,
                                        }
                                      : it,
                                  ),
                                );
                              }}
                              className={`py-2 px-1.5 sm:px-2 rounded-xl text-xs font-bold border transition active:scale-95 cursor-pointer text-center ${
                                item.Felafil &&
                                item.ketchup &&
                                item.spices &&
                                !item.extraKetchup &&
                                !item.doubleFelafil
                                  ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                                  : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                              }`}
                            >
                              <span className="block text-xs">Standard</span>
                              <span className="text-[10px] font-normal opacity-75 block">All Toppings</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setItems((prev) =>
                                  prev.map((it, i) =>
                                    i === index
                                      ? {
                                          ...it,
                                          Felafil: true,
                                          ketchup: true,
                                          spices: false,
                                          extraKetchup: false,
                                          doubleFelafil: false,
                                        }
                                      : it,
                                  ),
                                );
                              }}
                              className={`py-2 px-1.5 sm:px-2 rounded-xl text-xs font-bold border transition active:scale-95 cursor-pointer text-center ${
                                item.Felafil &&
                                item.ketchup &&
                                !item.spices &&
                                !item.extraKetchup &&
                                !item.doubleFelafil
                                  ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                                  : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                              }`}
                            >
                              <span className="block text-xs">No Spice</span>
                              <span className="text-[10px] font-normal opacity-75 block">Mild</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setItems((prev) =>
                                  prev.map((it, i) =>
                                    i === index
                                      ? {
                                          ...it,
                                          Felafil: true,
                                          ketchup: true,
                                          spices: true,
                                          extraKetchup: true,
                                          doubleFelafil: true,
                                        }
                                      : it,
                                  ),
                                );
                              }}
                              className={`py-2 px-1.5 sm:px-2 rounded-xl text-xs font-bold border transition active:scale-95 cursor-pointer text-center ${
                                item.extraKetchup && item.doubleFelafil
                                  ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                                  : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                              }`}
                            >
                              <span className="block text-xs">Loaded</span>
                              <span className="text-[10px] font-normal opacity-75 block">Double Extras</span>
                            </button>
                          </div>
                        </div>

                        {/* Seasoning & Extras Pill Toggles */}
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                            Custom Extras & Toggles
                          </label>
                          <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
                            <button
                              type="button"
                              onClick={() => toggleItemField(index, "spices")}
                              className={`py-2.5 px-3 min-h-[42px] rounded-xl font-extrabold border-2 transition cursor-pointer active:scale-98 ${
                                item.spices
                                  ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                                  : "bg-white text-gray-800 border-gray-200 hover:border-amber-300"
                              }`}
                            >
                              {item.spices ? "Spices" : "No Spices"}
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleItemField(index, "ketchup")}
                              className={`py-2.5 px-3 min-h-[42px] rounded-xl font-extrabold border-2 transition cursor-pointer active:scale-98 ${
                                item.ketchup
                                  ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                                  : "bg-white text-gray-800 border-gray-200 hover:border-amber-300"
                              }`}
                            >
                              {item.ketchup ? "Ketchup" : "No Ketchup"}
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleItemField(index, "extraKetchup")}
                              className={`py-2.5 px-3 min-h-[42px] rounded-xl font-extrabold border-2 transition cursor-pointer active:scale-98 ${
                                item.extraKetchup
                                  ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                                  : "bg-white text-gray-800 border-gray-200 hover:border-amber-300"
                              }`}
                            >
                              + Extra Ketchup (+{pricing?.extraKetchupPrice} Birr)
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleItemField(index, "doubleFelafil")}
                              className={`py-2.5 px-3 min-h-[42px] rounded-xl font-extrabold border-2 transition cursor-pointer active:scale-98 ${
                                item.doubleFelafil
                                  ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                                  : "bg-white text-gray-800 border-gray-200 hover:border-amber-300"
                              }`}
                            >
                              + Double Felafil (+{pricing?.doubleFelafilPrice} Birr)
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* FETIRA CUSTOMIZATION */}
                    {item.foodType === "fetira" && (
                      <div className="space-y-2 pt-1">
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                          Extra Eggs (+{pricing?.fetiraExtraEggPrice} Birr / egg)
                        </label>
                        <div className="flex gap-2">
                          {[0, 1, 2, 3].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() =>
                                handleItemChange(index, {
                                  target: { name: "extraEggs", value: num },
                                })
                              }
                              className={`flex-1 py-2.5 px-2 min-h-[44px] rounded-xl text-xs sm:text-sm font-extrabold border-2 transition cursor-pointer active:scale-98 ${
                                (Number(item.extraEggs) || 0) === num
                                  ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                                  : "bg-white text-gray-800 border-gray-200 hover:border-amber-300"
                              }`}
                            >
                              {num === 0 ? "Standard" : `+${num} Egg${num > 1 ? "s" : ""}`}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* DONUT CUSTOMIZATION */}
                    {item.foodType === "donut" && (
                      <div className="space-y-2 pt-1">
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                          Package Size
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {DONUT_PACKAGE_OPTIONS.map((pairs) => (
                            <button
                              key={pairs}
                              type="button"
                              onClick={() =>
                                handleItemChange(index, {
                                  target: { name: "donutPairsPerPackage", value: pairs },
                                })
                              }
                              className={`py-2.5 sm:py-3 px-3 min-h-[46px] rounded-xl text-xs sm:text-sm font-extrabold border-2 transition cursor-pointer active:scale-98 ${
                                (Number(item.donutPairsPerPackage) || 1) === pairs
                                  ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                                  : "bg-white text-gray-800 border-gray-200 hover:border-amber-300"
                              }`}
                            >
                              {pairs} Pair{pairs > 1 ? "s" : ""} ({pairs * 2} donuts)
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quantity Stepper & Line Price */}
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                      {/* Touch-Friendly Stepper (44px target) */}
                      <div className="flex items-center gap-3 bg-gray-50/80 p-1.5 rounded-2xl border-2 border-gray-200">
                        <button
                          type="button"
                          onClick={() => updateItemQuantity(index, -1)}
                          className="w-11 h-11 rounded-xl bg-white border-2 border-gray-200 hover:border-amber-400 hover:bg-amber-50 text-gray-900 flex items-center justify-center transition cursor-pointer shadow-xs active:scale-95 font-bold"
                          title="Decrease quantity"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="font-black text-base sm:text-lg min-w-[32px] text-center text-gray-950">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateItemQuantity(index, 1)}
                          className="w-11 h-11 rounded-xl bg-white border-2 border-gray-200 hover:border-amber-400 hover:bg-amber-50 text-gray-900 flex items-center justify-center transition cursor-pointer shadow-xs active:scale-95 font-bold"
                          title="Increase quantity"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Line Total */}
                      <div className="text-right">
                        <span className="text-xs font-semibold text-gray-600 block">
                          Unit: {unitPrice} Birr
                        </span>
                        <span className="text-base sm:text-lg font-black text-amber-950">
                          {lineTotal} Birr
                        </span>
                      </div>
                    </div>

                    {/* Put in Cart Done Button */}
                    <button
                      type="button"
                      onClick={() => handleDoneCustomizing(index)}
                      className="w-full mt-3 min-h-[46px] py-2.5 px-4 rounded-2xl bg-gray-900 hover:bg-black active:scale-98 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Done Customizing • Put in Cart</span>
                    </button>
                  </div>
                );
              })}

              {/* Add Another Item Section: Toggle between Quick-Add Menu and Button */}
              {!showAddMenu ? (
                <button
                  type="button"
                  onClick={() => {
                    handleDoneCustomizing();
                    setShowAddMenu(true);
                  }}
                  className="w-full min-h-[48px] py-3 border border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 rounded-2xl text-gray-800 font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs active:scale-98"
                >
                  <Plus className="w-4 h-4 text-gray-700" />
                  <span>Add Another Food Item</span>
                </button>
              ) : (
                <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-200 shadow-sm space-y-3.5 transition-all">
                  {/* Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider text-gray-950 block">
                        Add Food to Order
                      </span>
                      <p className="text-[11px] font-medium text-gray-500">
                        Select an item to add to your cart
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddMenu(false)}
                      className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 flex items-center justify-center transition cursor-pointer"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Available Food Items Grid (No emojis, unavailable items hidden) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {getSelectableFoodTypes().map((foodType) => {
                      const basePrice = getBasePriceForFoodType(foodType);
                      const itemsOfThisType = items.filter(
                        (it) => it.foodType === foodType,
                      );
                      const inCartQty = itemsOfThisType.reduce(
                        (sum, it) => sum + (Number(it.quantity) || 1),
                        0,
                      );
                      const isCustomizable =
                        foodType === "ertib" ||
                        foodType === "fetira" ||
                        foodType === "donut";

                      return (
                        <button
                          key={foodType}
                          type="button"
                          onClick={() => {
                            if (activeItemIndex != null) {
                              handleDoneCustomizing();
                            }
                            addItem(foodType);
                          }}
                          className="p-3.5 rounded-2xl border border-gray-200 bg-white hover:border-gray-300 hover:shadow-xs transition-all flex items-center justify-between gap-3 text-left group cursor-pointer active:scale-98 shadow-2xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-sm text-gray-900 block truncate transition-colors">
                                {FOOD_TYPE_LABELS[foodType]}
                              </span>
                              {inCartQty > 0 && isCustomizable && (
                                <span className="text-[10px] font-semibold text-gray-700 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full inline-flex items-center">
                                  <span>Different Specs</span>
                                </span>
                              )}
                              {inCartQty > 0 && !isCustomizable && (
                                <span className="text-[10px] font-semibold text-gray-700 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
                                  In cart ({inCartQty})
                                </span>
                              )}
                            </div>

                            <span className="text-xs font-bold text-gray-800 mt-0.5 block">
                              {basePrice != null ? `${basePrice} Birr` : "Price on menu"}
                            </span>

                            {inCartQty > 0 && isCustomizable && (
                              <div className="mt-1 space-y-0.5">
                                <p className="text-[11px] text-gray-600 font-medium leading-snug break-words">
                                  {itemsOfThisType.map((it) => describeItem(it)).join(", ")} in cart
                                </p>
                                <p className="text-[10px] text-gray-500 font-normal leading-snug">
                                  Tap to add with different specifications
                                </p>
                              </div>
                            )}
                            {inCartQty > 0 && !isCustomizable && (
                              <p className="text-[11px] text-gray-500 font-normal mt-0.5 leading-snug">
                                Tap to add +1 more
                              </p>
                            )}
                          </div>

                          <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-800 bg-gray-100 group-hover:bg-amber-500 group-hover:text-white px-3 py-1.5 rounded-xl transition-all shadow-2xs shrink-0">
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>
                              {inCartQty > 0 && isCustomizable
                                ? "New Specs"
                                : inCartQty > 0
                                ? "+1 More"
                                : "Add"}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 2: DELIVERY DESTINATION */}
            <div className="space-y-3 pt-3 border-t border-gray-200/80">
              <div className="px-1 flex items-center justify-between">
                <h2 className="font-extrabold text-base text-gray-950 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-600" />
                  <span>Delivery Destination</span>
                </h2>
                {hasPrefilledDelivery && !isEditingDelivery && (
                  <span className="text-xs font-semibold text-gray-500">
                    AASTU Campus
                  </span>
                )}
              </div>

              {/* Delivery Destination Card (Smart Collapsed vs Expanded) */}
              {hasPrefilledDelivery && !isEditingDelivery ? (
              <div className="space-y-2">
                <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-sm flex items-center justify-between gap-3 group transition-all hover:border-amber-300">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 shadow-xs">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500 truncate">
                          {customer.customerName} • {customer.phone}
                        </span>
                      </div>
                      <p className="font-extrabold text-sm sm:text-base text-gray-950 truncate">
                        {customer.location}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsEditingDelivery(true)}
                    className="px-3.5 py-2 rounded-xl border border-gray-200 bg-gray-50 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-800 active:bg-gray-200 text-gray-800 text-xs font-extrabold transition flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95 shadow-xs"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Change</span>
                  </button>
                </div>

                {!user && (
                  <div className="flex items-center justify-between px-2 text-xs">
                    <span className="flex items-center gap-1 text-gray-500 text-[11px]">
                      <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
                      1-tap reordering active
                    </span>
                    <Link
                      to="/login?redirect=/order"
                      className="text-amber-700 hover:text-amber-800 font-bold hover:underline text-[11px]"
                    >
                      Have an account? Log in →
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-amber-600" />
                    <h2 className="font-extrabold text-base text-gray-950">
                      {isUserAdmin ? "Customer Delivery Details" : "Delivery Details"}
                    </h2>
                    {isUserAdmin && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-700">
                        Admin Mode
                      </span>
                    )}
                  </div>
                  {hasPrefilledDelivery && (
                    <button
                      type="button"
                      onClick={() => setIsEditingDelivery(false)}
                      className="text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-3 py-1 rounded-xl border border-amber-200 transition cursor-pointer"
                    >
                      Done
                    </button>
                  )}
                </div>

                {isUserAdmin && (
                  <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-3 text-xs text-blue-900 space-y-0.5">
                    <p className="font-extrabold text-blue-950">
                      Fill Customer's Information
                    </p>
                    <p className="text-blue-700 font-medium text-[11px] leading-relaxed">
                      Customer name defaults to "{DEFAULT_CUSTOMER_NAME}". Simply enter their phone number and dorm block. After confirming, you can immediately send an SMS to the customer.
                    </p>
                  </div>
                )}

                <div className="space-y-3.5">
                  {/* Name Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs sm:text-sm font-extrabold text-gray-800">
                        {isUserAdmin ? "Customer Name" : "Your Name"}
                      </label>
                      {isUserAdmin && (
                        <span className="text-[11px] font-bold text-gray-500">
                          Default: <span className="text-blue-700 font-extrabold">{DEFAULT_CUSTOMER_NAME}</span>
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <User className="w-5 h-5 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        name="customerName"
                        placeholder={isUserAdmin ? `Default: "${DEFAULT_CUSTOMER_NAME}" (or custom name)` : "e.g. Dawit Kebede"}
                        value={customer.customerName}
                        onChange={handleCustomerChange}
                        className={`w-full pl-11 pr-4 py-3 min-h-[48px] rounded-xl border-2 text-base sm:text-sm font-semibold text-gray-950 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 transition ${
                          fieldErrors.customerName
                            ? "border-rose-400 focus:ring-rose-400 focus:border-rose-400 bg-rose-50/20"
                            : "border-gray-200 focus:ring-amber-400 focus:border-amber-400"
                        }`}
                        required={!isUserAdmin}
                      />
                    </div>
                    {isUserAdmin && (
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className="text-[11px] text-gray-500 font-medium">Quick Presets:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomer((prev) => ({ ...prev, customerName: DEFAULT_CUSTOMER_NAME }));
                            if (fieldErrors.customerName) setFieldErrors((prev) => ({ ...prev, customerName: false }));
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition border cursor-pointer active:scale-95 ${
                            customer.customerName === DEFAULT_CUSTOMER_NAME
                              ? "bg-blue-100 border-blue-300 text-blue-900 shadow-2xs"
                              : "bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700"
                          }`}
                        >
                          👤 {DEFAULT_CUSTOMER_NAME}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomer((prev) => ({ ...prev, customerName: "Customer" }));
                            if (fieldErrors.customerName) setFieldErrors((prev) => ({ ...prev, customerName: false }));
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition border cursor-pointer active:scale-95 ${
                            customer.customerName === "Customer"
                              ? "bg-blue-100 border-blue-300 text-blue-900 shadow-2xs"
                              : "bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700"
                          }`}
                        >
                          👤 Customer
                        </button>
                        {customer.customerName && (
                          <button
                            type="button"
                            onClick={() => setCustomer((prev) => ({ ...prev, customerName: "" }))}
                            className="px-2 py-1 rounded-lg text-xs font-semibold text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Phone Input */}
                  <div>
                    <label className="block text-xs sm:text-sm font-extrabold text-gray-800 mb-1.5">
                      {isUserAdmin ? "Customer Phone Number" : "Phone Number"}
                    </label>
                    <div className="relative">
                      <Phone className="w-5 h-5 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        name="phone"
                        placeholder={isUserAdmin ? "09... or 07... (Customer's active phone)" : "0911 234 567"}
                        value={customer.phone}
                        onChange={handleCustomerChange}
                        className={`w-full pl-11 pr-4 py-3 min-h-[48px] rounded-xl border-2 text-base sm:text-sm font-semibold text-gray-950 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 transition ${
                          fieldErrors.phone
                            ? "border-rose-400 focus:ring-rose-400 focus:border-rose-400 bg-rose-50/20"
                            : "border-gray-200 focus:ring-amber-400 focus:border-amber-400"
                        }`}
                        required
                      />
                    </div>
                  </div>

                  {/* Location Input with Datalist */}
                  <div>
                    <label className="block text-xs sm:text-sm font-extrabold text-gray-800 mb-1.5">
                      {isUserAdmin ? "Customer Dorm Block & Room" : "AASTU Dorm Block & Room"}
                    </label>
                    <div className="relative">
                      <MapPin className="w-5 h-5 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        list="blockOptions"
                        type="text"
                        name="location"
                        placeholder={isUserAdmin ? "e.g. Block 14, Room 204" : "e.g. Block 14, Room 204"}
                        value={customer.location}
                        onChange={handleCustomerChange}
                        className={`w-full pl-11 pr-4 py-3 min-h-[48px] rounded-xl border-2 text-base sm:text-sm font-semibold text-gray-950 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 transition ${
                          fieldErrors.location
                            ? "border-rose-400 focus:ring-rose-400 focus:border-rose-400 bg-rose-50/20"
                            : "border-gray-200 focus:ring-amber-400 focus:border-amber-400"
                        }`}
                        required
                      />
                      <datalist id="blockOptions">
                        {Array.from({ length: 28 }, (_, i) => (
                          <option key={i + 1} value={`Block ${i + 1}`} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  {!user && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-1.5 border-t border-gray-100 text-xs">
                      <span className="flex items-center gap-1 text-amber-700 font-semibold text-[11px]">
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        We'll remember your name & dorm on this device!
                      </span>
                      <Link
                        to="/login?redirect=/order"
                        className="text-amber-800 font-bold hover:underline text-[11px]"
                      >
                        Have an account? Log in →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
            </div>

            {/* Floating Checkout Bar (Mobile: Stacked on top of mobile nav, Desktop: Clean card) */}
            <div
              className="fixed inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-4 py-3 sm:static sm:inset-auto sm:z-auto sm:bg-white sm:backdrop-blur-none sm:rounded-3xl sm:border sm:border-gray-150 sm:shadow-xs sm:p-5 sm:mt-6 transition-all"
              style={{
                bottom: "calc(58px + env(safe-area-inset-bottom, 0px))",
              }}
            >
              <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-500 block">
                      Total
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full inline-flex items-center">
                      {totalItemsCount} {totalItemsCount === 1 ? "item" : "items"}
                    </span>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-gray-900 leading-none mt-1">
                    {orderTotal}{" "}
                    <span className="text-xs sm:text-sm text-gray-500 font-bold">Birr</span>
                  </div>
                  {/* Real-time Cart Items Summary */}
                  {items.length > 0 && (
                    <p className="text-[11px] text-gray-500 font-medium truncate max-w-[190px] sm:max-w-xs mt-0.5">
                      {items
                        .map(
                          (it) =>
                            `${it.quantity}× ${FOOD_TYPE_LABELS[it.foodType]}`,
                        )
                        .join(", ")}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={items.length === 0}
                  className="min-h-[46px] sm:min-h-[48px] py-2.5 sm:py-3 px-5 sm:px-7 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm sm:text-base shadow-md shadow-amber-300/60 transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <span>Review Order</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* REVIEW MODE SCREEN */
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-gray-100 shadow-sm space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-950">
                {isUserAdmin ? "Review Customer Order" : "Review Your Order"}
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 font-medium mt-0.5">
                {isUserAdmin
                  ? "Verify customer details and order summary before confirming"
                  : "Please verify your delivery location and items before confirming"}
              </p>
            </div>

            {/* Error / Status Alert in Review Mode */}
            {message && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start justify-between gap-3 shadow-xs">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>{message}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setMessage("")}
                  className="text-amber-700 hover:text-amber-900 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Delivery Recipient Summary */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gray-50 border border-gray-200 text-xs sm:text-sm space-y-1.5">
              <p className="font-bold text-gray-900 text-sm sm:text-base">
                {isUserAdmin ? "Customer: " : "Recipient: "}{customer.customerName}
              </p>
              <p className="text-gray-700 font-medium">
                {isUserAdmin ? "Customer Phone: " : "Phone: "}
                <span className="font-mono font-bold text-gray-900">{customer.phone}</span>
              </p>
              <p className="text-gray-700 font-medium">
                {isUserAdmin ? "Delivery Dorm: " : "Dorm Location: "}
                <span className="text-gray-900 font-bold">{customer.location}</span>
              </p>
            </div>

            {/* Itemized Breakdown */}
            <div className="space-y-2.5">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-gray-700">
                Itemized Summary
              </h3>
              <div className="divide-y divide-gray-100 border-2 border-gray-100 rounded-2xl p-4">
                {items.map((item, i) => (
                  <div
                    key={i}
                    className="py-3 flex items-center justify-between text-xs sm:text-sm gap-3"
                  >
                    <span className="font-bold text-gray-900 leading-snug">
                      {describeItem(item)}
                    </span>
                    <span className="font-black text-gray-950 shrink-0 ml-3 text-sm sm:text-base">
                      {getUnitPrice(item) * item.quantity} Birr
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-gray-700">
                  Payment Method
                </h3>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Campus Friendly
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Cash on Delivery option */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("cod")}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                    paymentMethod === "cod"
                      ? "border-emerald-500 bg-emerald-50/50 shadow-sm ring-2 ring-emerald-500/20"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="flex items-center gap-2 font-black text-gray-950 text-sm">
                      <Banknote className="w-4 h-4 text-emerald-600 shrink-0" />
                      Cash on Delivery
                    </span>
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        paymentMethod === "cod"
                          ? "border-emerald-600 bg-emerald-600"
                          : "border-gray-300"
                      }`}
                    >
                      {paymentMethod === "cod" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 font-medium">
                    Pay cash directly to the runner when delivered to your dorm.
                  </p>
                </button>

                {/* Mobile / Bank Transfer option */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("online")}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                    paymentMethod === "online"
                      ? "border-amber-500 bg-amber-50/50 shadow-sm ring-2 ring-amber-500/20"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="flex items-center gap-2 font-black text-gray-950 text-sm">
                      <Smartphone className="w-4 h-4 text-amber-600 shrink-0" />
                      Telebirr / CBE
                    </span>
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        paymentMethod === "online"
                          ? "border-amber-600 bg-amber-600"
                          : "border-gray-300"
                      }`}
                    >
                      {paymentMethod === "online" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 font-medium">
                    Pay via Telebirr/CBE & upload screenshot on tracking page.
                  </p>
                </button>
              </div>

              {/* Payment Method Helper Tip */}
              {paymentMethod === "cod" ? (
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center gap-2.5 text-xs text-emerald-950 font-semibold">
                  <Banknote className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    Pay <strong className="font-extrabold text-emerald-900">{orderTotal} Birr</strong> in cash when your order arrives at your dorm.
                  </span>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-gray-700 shrink-0" />
                      <span>Direct Transfer Account</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(orderTotal.toString(), "amount")}
                      className="px-2.5 py-1 rounded-lg bg-gray-200 hover:bg-gray-300 active:scale-95 text-gray-800 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      {copiedField === "amount" ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-700" />
                          <span>Amount Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy {orderTotal} Birr</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Telebirr / CBEBirr Option */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-gray-200 text-xs">
                    <div>
                      <span className="font-bold text-gray-900 block">
                        Telebirr / CBEBirr: <span className="text-gray-900 font-extrabold">0954724664</span>
                      </span>
                      <span className="text-[11px] text-gray-500 font-medium">Abdurazak Mohammed</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyText("0954724664", "telebirr")}
                      className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-800 text-xs font-semibold transition flex items-center gap-1 cursor-pointer active:scale-95"
                    >
                      {copiedField === "telebirr" ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* CBE Bank Option */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-gray-200 text-xs">
                    <div>
                      <span className="font-bold text-gray-900 block">
                        CBE: <span className="text-gray-900 font-extrabold">1000528463243</span>
                      </span>
                      <span className="text-[11px] text-gray-500 font-medium">Abdurazak Mohammed</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyText("1000528463243", "cbe")}
                      className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-800 text-xs font-semibold transition flex items-center gap-1 cursor-pointer active:scale-95"
                    >
                      {copiedField === "cbe" ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-[11px] text-gray-600 font-normal leading-relaxed">
                    Transfer exact amount, then upload screenshot on the tracking page after confirming.
                  </p>
                </div>
              )}
            </div>

            {/* Grand Total */}
            <div className="flex items-center justify-between pt-2 border-t-2 border-gray-100">
              <span className="font-bold text-sm text-gray-700">
                Total to Pay
              </span>
              <span className="text-2xl sm:text-3xl font-black text-amber-950">
                {orderTotal} Birr
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={handleBack}
                disabled={Boolean(submittingAction)}
                className="w-full sm:flex-1 min-h-[50px] py-3.5 px-4 rounded-2xl bg-white hover:bg-gray-100 active:bg-gray-200 text-gray-900 border-2 border-gray-200 font-extrabold text-sm transition cursor-pointer active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4 text-gray-700" />
                <span>Back to Edit</span>
              </button>

              {isUserAdmin ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleConfirmOrder({ autoSendSms: true })}
                    disabled={Boolean(submittingAction)}
                    className="w-full sm:flex-1 min-h-[50px] py-3.5 px-4 rounded-2xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:bg-blue-800 text-white font-extrabold text-sm shadow-md shadow-blue-200 transition cursor-pointer flex items-center justify-center gap-2 active:scale-98 disabled:opacity-60"
                  >
                    {submittingAction === "sms" ? (
                      <span>Placing & Opening SMS...</span>
                    ) : (
                      <>
                        <FaPaperPlaneIcon className="text-xs" />
                        <span>Confirm & Send SMS</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleConfirmOrder({ autoSendSms: false })}
                    disabled={Boolean(submittingAction)}
                    className="w-full sm:flex-1 min-h-[50px] py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-extrabold text-sm shadow-md shadow-amber-200/60 transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 disabled:opacity-60"
                  >
                    {submittingAction === "only" ? (
                      <span>Placing Order...</span>
                    ) : (
                      <>
                        <span>Confirm Order Only</span>
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      </>
                    )}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => handleConfirmOrder({ autoSendSms: false })}
                  disabled={Boolean(submittingAction)}
                  className="w-full sm:flex-1 min-h-[50px] py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-extrabold text-sm shadow-md shadow-amber-200/60 transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 disabled:opacity-60"
                >
                  {submittingAction === "only" ? (
                    <span>Placing Order...</span>
                  ) : (
                    <>
                      <span>Confirm Order</span>
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
