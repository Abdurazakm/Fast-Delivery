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
} from "lucide-react";
import { FaPaperPlane as FaPaperPlaneIcon } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import Toast from "./Toast";
import API from "../api";
import { getSocket } from "../socket";

const DEFAULT_PRICING = {
  sambusaPrice: 30,
  boiledEggPrice: 30,
  ertibNormalPrice: 145,
  ertibSpecialPrice: 170,
  fetiraBasePrice: 150,
  fetiraExtraEggPrice: 30,
  donut1PairPackagePrice: 60,
  donut2PairPackagePrice: 120,
  donut4PairPackagePrice: 220,
  donut6PairPackagePrice: 320,
  extraKetchupPrice: 15,
  doubleFelafilPrice: 20,
};

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

// Post-Order Celebratory Splash Modal with Role-Aware Experience
function OrderSuccessModal({
  order,
  onTrackNow,
  onTakeNextOrder,
  onGoDashboard,
  buildManualOrderSmsMessage,
}) {
  const isAdmin = Boolean(order?.createdByAdmin);
  const [countdown, setCountdown] = useState(2);

  // Auto-redirect only for regular customers
  useEffect(() => {
    if (isAdmin) return;

    if (countdown <= 0) {
      onTrackNow(order?.trackingCode);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 900);

    return () => clearTimeout(timer);
  }, [isAdmin, countdown, onTrackNow, order?.trackingCode]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.85, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative bg-white rounded-3xl shadow-2xl max-w-sm sm:max-w-md w-full p-5 sm:p-8 text-center border border-gray-100 overflow-hidden max-h-[92vh] overflow-y-auto"
      >
        {/* Animated Celebration Icon */}
        <div className="relative mx-auto mb-4 w-20 h-20 flex items-center justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.1, damping: 15 }}
            className={`w-20 h-20 rounded-full text-white flex items-center justify-center shadow-lg ${
              isAdmin
                ? "bg-linear-to-tr from-blue-600 to-indigo-500 shadow-blue-200"
                : "bg-linear-to-tr from-emerald-500 to-teal-400 shadow-emerald-200"
            }`}
          >
            <CheckCircle2 className="w-10 h-10" />
          </motion.div>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute -top-1 -right-1 text-amber-500"
          >
            <Sparkles className="w-6 h-6" />
          </motion.div>
        </div>

        {/* Heading & Subtitle */}
        <h2 className="text-xl sm:text-2xl font-black text-gray-950 tracking-tight">
          {isAdmin ? "Manual Order Created!" : "Order Placed Successfully!"}
        </h2>
        <p className="text-xs sm:text-sm text-gray-700 font-medium mt-1 leading-relaxed">
          {isAdmin
            ? "Order has been logged in the system and kitchen queue."
            : "We've received your order and sent it to the kitchen."}
        </p>

        {/* Order Details Strip */}
        <div className="mt-5 p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between text-left">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
              Tracking Code
            </span>
            <span className="font-mono text-base font-black text-gray-950 mt-0.5 block">
              {order?.trackingCode}
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
              Total Amount
            </span>
            <span className="text-base font-black text-amber-950 mt-0.5 block">
              {order.total} <span className="text-xs text-amber-800 font-bold">Birr</span>
            </span>
          </div>
        </div>

        {/* For Customer: Auto-redirect countdown bar */}
        {!isAdmin && (
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs sm:text-sm text-gray-700 mb-1.5 font-bold">
              <span>Redirecting to live tracking...</span>
              <span className="text-amber-800 font-black">{countdown}s</span>
            </div>
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-200/60">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.8, ease: "linear" }}
                className="h-full bg-linear-to-r from-amber-500 to-emerald-500 rounded-full"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 space-y-2.5">
          {isAdmin ? (
            /* ADMIN OPERATIONAL CONTROLS */
            <>
              {/* 1. Send Order SMS */}
              {order.customerPhone && (
                <button
                  type="button"
                  onClick={() => {
                    const messageToSend = buildManualOrderSmsMessage(order);
                    const smsUrl = `sms:${order.customerPhone}?body=${encodeURIComponent(messageToSend)}`;
                    window.location.href = smsUrl;
                  }}
                  className="w-full min-h-[48px] py-3 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-sm sm:text-base shadow-md shadow-blue-200 transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FaPaperPlaneIcon className="text-sm" />
                  <span>Send SMS to Customer ({order.customerPhone})</span>
                </button>
              )}

              {/* 2. Take Next Phone Order & Admin Dashboard */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onTakeNextOrder}
                  className="flex-1 min-h-[46px] py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs sm:text-sm font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-amber-200 active:scale-98"
                >
                  <span>+ Next Order</span>
                </button>

                <button
                  type="button"
                  onClick={onGoDashboard}
                  className="flex-1 min-h-[46px] py-2.5 px-3 rounded-xl bg-white hover:bg-gray-100 active:bg-gray-200 text-gray-900 border-2 border-gray-200 text-xs sm:text-sm font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                >
                  <span>📊 Dashboard</span>
                </button>
              </div>

              {/* 3. View Customer Tracking View */}
              <button
                type="button"
                onClick={() => onTrackNow(order?.trackingCode)}
                className="w-full min-h-[40px] py-2 text-xs sm:text-sm font-bold text-gray-600 hover:text-amber-800 transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <Bike className="w-4 h-4" />
                <span>View Order Tracking Page →</span>
              </button>
            </>
          ) : (
            /* REGULAR CUSTOMER ACTIONS */
            <button
              type="button"
              onClick={() => onTrackNow(order?.trackingCode)}
              className="w-full min-h-[50px] py-3.5 px-5 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-extrabold text-sm sm:text-base shadow-md shadow-amber-200/60 transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Bike className="w-5 h-5 shrink-0" />
              <span>Track Your Order Now</span>
              <ArrowRight className="w-4 h-4 ml-0.5 shrink-0" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function Order() {
  const [customer, setCustomer] = useState({
    customerName: "",
    phone: "",
    location: "",
  });
  const [tracking, setTracking] = useState(null);
  const [orderSuccessModal, setOrderSuccessModal] = useState(null);
  const [user, setUser] = useState(null);
  const isUserAdmin = (user?.role || "").toLowerCase() === "admin";
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
  const [message, setMessage] = useState("");
  const [pricing, setPricing] = useState(DEFAULT_PRICING);
  const [itemAvailability, setItemAvailability] = useState(
    DEFAULT_ITEM_AVAILABILITY,
  );
  const [reviewMode, setReviewMode] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editCode, setEditCode] = useState(null);
  const [toast, setToast] = useState(null);
  const [duplicateOrderHint, setDuplicateOrderHint] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const res = await API.get("/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(res.data);
        setCustomer({
          customerName: res.data.name || "",
          phone: res.data.phone || "",
          location: res.data.location || "",
        });
      } catch (err) {
        console.error("❌ Failed to load user:", err);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchAvailabilityAndPricing = async () => {
      try {
        const [availRes, pricingRes] = await Promise.all([
          API.get("/availability"),
          API.get("/orders/pricing"),
        ]);

        if (availRes.data?.itemAvailability) {
          setItemAvailability({
            ...DEFAULT_ITEM_AVAILABILITY,
            ...availRes.data.itemAvailability,
          });
        }

        if (pricingRes.data) {
          setPricing((prev) => ({ ...prev, ...pricingRes.data }));
        }
      } catch (err) {
        console.error("Failed to load availability/pricing:", err);
      }
    };

    fetchAvailabilityAndPricing();

    const socket = getSocket();
    const handleAvailabilityUpdated = (payload) => {
      if (!payload?.itemAvailability) return;
      setItemAvailability({
        ...DEFAULT_ITEM_AVAILABILITY,
        ...payload.itemAvailability,
      });
    };

    const handlePricingUpdated = (payload) => {
      if (!payload) return;
      setPricing((prev) => ({ ...prev, ...payload }));
    };

    socket.on("availability:updated", handleAvailabilityUpdated);
    socket.on("pricing:updated", handlePricingUpdated);

    return () => {
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
      } catch (err) {
        console.error("Failed to fetch order for edit:", err);
        setMessage("Could not load order for editing.");
      }
    };

    fetchOrderForEdit();
  }, [location.search]);

  const getUnitPrice = (item) => {
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

  const handleCustomerChange = (e) => {
    const { name, value } = e.target;
    setCustomer((prev) => ({ ...prev, [name]: value }));
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

  const addItem = () => {
    const fallbackFoodType =
      Object.keys(DEFAULT_ITEM_AVAILABILITY).find(
        (foodType) => itemAvailability[foodType] !== false,
      ) || "ertib";

    setItems((prev) => [...prev, buildDefaultItem(fallbackFoodType)]);
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const getSelectableFoodTypes = () => {
    const allFoodTypes = Object.keys(FOOD_TYPE_LABELS);
    if (isUserAdmin) return allFoodTypes;

    return allFoodTypes.filter(
      (foodType) => itemAvailability[foodType] !== false,
    );
  };

  const describeItem = (item) => {
    if (item.foodType === "sambusa") {
      return `${item.quantity} × Sambusa`;
    }

    if (item.foodType === "boiled_egg") {
      return `${item.quantity} × Boiled Egg`;
    }

    if (item.foodType === "fetira") {
      const extraEggs = Math.max(0, Number(item.extraEggs) || 0);
      return extraEggs > 0
        ? `${item.quantity} × Fetira (+${extraEggs} extra egg${extraEggs > 1 ? "s" : ""})`
        : `${item.quantity} × Fetira`;
    }

    if (item.foodType === "donut") {
      const pairs = Number(item.donutPairsPerPackage) || 1;
      const packages = Number(item.quantity) || 0;
      return `${packages} × Donut (${pairs} pair${pairs > 1 ? "s" : ""} / ${pairs * 2} donuts)`;
    }

    let desc = `${item.quantity} × ${item.ertibType} Ertib`;
    if (item.spices && item.ketchup) desc += " (Spices & Ketchup)";
    else if (item.spices && !item.ketchup) desc += " (Only Spices)";
    else if (!item.spices && item.ketchup) desc += " (Only Ketchup)";
    else desc += " (No spices/ketchup)";

    if (item.extraKetchup) desc += " + extra ketchup";
    if (item.doubleFelafil) desc += " + double felafil";
    else if (item.Felafil === false) desc += " + no felafil";

    return desc;
  };

  const handleReview = (e) => {
    e.preventDefault();
    if (!customer.customerName.trim() || !customer.phone.trim() || !customer.location.trim()) {
      setMessage("Please fill in all delivery details.");
      return;
    }
    setReviewMode(true);
  };

  const handleConfirmOrder = async ({ forceCreateDuplicate = false } = {}) => {
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
    const payload = {
      ...customer,
      items: itemList,
      total,
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
        navigate(`/track/${encodeURIComponent(updated.trackingCode || editCode)}`, {
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

        localStorage.setItem("last_order_tracking", finalTrackingCode);
        localStorage.setItem("last_order_phone", finalPhone);

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

        if (isUserAdmin) {
          const orderSummary = {
            trackingCode: finalTrackingCode,
            trackingLink: orderData.trackUrl,
            createdByAdmin: true,
            customerPhone: finalPhone,
            paymentStatus: orderData.paymentStatus || "unpaid",
            total: orderData.total ?? total,
          };

          setOrderSuccessModal(orderSummary);
          setTracking(orderSummary);

          // Reset form behind modal so admin can immediately take next phone order
          setCustomer({ customerName: "", phone: "", location: "" });
          setItems([buildDefaultItem("ertib")]);
          setReviewMode(false);
        } else {
          // Regular customer (other user): immediately transition to live tracking page!
          navigate(`/track/${encodeURIComponent(finalTrackingCode)}?justPlaced=1`, {
            replace: true,
          });
          return;
        }
      }
    } catch (err) {
      console.error("❌ Order failed:", err);
      const duplicatePayload = err.response?.data;
      if (
        err.response?.status === 409 &&
        duplicatePayload?.code === "EXISTING_PHONE_ORDER"
      ) {
        setDuplicateOrderHint(duplicatePayload.existingOrder || null);
      }
      setMessage(
        err.response?.data?.message ||
          err.message ||
          "Failed to place order. Try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => setReviewMode(false);

  const handleTrackNow = (targetCode = orderSuccessModal?.trackingCode) => {
    const code = targetCode || orderSuccessModal?.trackingCode;
    if (!code) return;
    navigate(`/track/${encodeURIComponent(code)}?justPlaced=1`, {
      replace: true,
    });
  };

  const buildManualOrderSmsMessage = (orderObj = orderSuccessModal || tracking) => {
    if (!orderObj) return "";

    const code = orderObj.trackingCode || "--";
    const trackLink = orderObj.trackingLink || "";
    const paymentStatus = String(
      orderObj.paymentStatus || "unpaid",
    ).toLowerCase();
    const amount = Number(orderObj.total || 0).toFixed(2);

    if (paymentStatus === "paid") {
      return `Hello, we received your payment for order (Code: ${code}). Your order is confirmed and being prepared. Track: ${trackLink}`;
    }

    return `Hello, your order (Code: ${code}) has been created, but payment is still required.\n\nAmount to pay: ${amount} Birr\n\nYour order will NOT be confirmed until payment is completed.\n\nPayment options:\nCBE: 1000528463243 (Abdurazak Mohammed)\nTelebirr: 0954724664 (Nur Muhammed)\nCBEBirr: 0954724664 (Abdurazak Mohammed)\n\nAfter payment, send screenshot via Telegram: https://t.me/ABDURAZACQ\n\nTrack: ${trackLink}`;
  };

  const orderTotal = items.reduce(
    (sum, item) => sum + getUnitPrice(item) * (Number(item.quantity) || 1),
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
            order={orderSuccessModal}
            buildManualOrderSmsMessage={buildManualOrderSmsMessage}
            onTrackNow={(code) =>
              handleTrackNow(code || orderSuccessModal.trackingCode)
            }
            onTakeNextOrder={() => setOrderSuccessModal(null)}
            onGoDashboard={() => navigate("/admin")}
          />
        )}
      </AnimatePresence>

      {/* Sticky Top Header Navigation */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xs">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-gray-700 hover:text-amber-600 py-1.5 px-2.5 rounded-xl hover:bg-amber-50 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Menu</span>
          </Link>

          <h1 className="font-extrabold text-sm sm:text-base text-gray-950">
            {editMode ? "Modify Your Order" : "Place Your Order"}
          </h1>

          <div className="flex items-center gap-2">
            {isUserAdmin ? (
              <Link
                to="/admin"
                className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold transition"
              >
                Dashboard
              </Link>
            ) : (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 hidden sm:inline">
                AASTU Dorm Delivery
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-xl mx-auto px-4 pt-6 space-y-5">
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

        {/* Possible Duplicate Order Notice */}
        {duplicateOrderHint?.trackingCode && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs sm:text-sm space-y-2.5 shadow-xs">
            <div className="font-bold flex items-center gap-2">
              <span>⚠️ Possible duplicate order detected</span>
            </div>
            <p className="text-gray-700 text-xs">
              An order for this phone is already active today (Code:{" "}
              <strong>{duplicateOrderHint.trackingCode}</strong>).
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() =>
                  navigate(`/track/${duplicateOrderHint.trackingCode}`)
                }
                className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 font-semibold text-xs hover:bg-amber-100 transition"
              >
                View Existing Order
              </button>
              {isUserAdmin && (
                <button
                  type="button"
                  onClick={() =>
                    handleConfirmOrder({ forceCreateDuplicate: true })
                  }
                  disabled={loading}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-semibold text-xs hover:bg-rose-700 transition"
                >
                  Create Anyway (Admin)
                </button>
              )}
            </div>
          </div>
        )}

        {/* ORDER FORM VS REVIEW SCREEN */}
        {!reviewMode ? (
          <form onSubmit={handleReview} className="space-y-5">
            {/* Delivery Information Card */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <MapPin className="w-4 h-4 text-amber-600" />
                <h2 className="font-extrabold text-base text-gray-950">
                  Delivery Details
                </h2>
              </div>

              <div className="space-y-3.5">
                {/* Name Input */}
                <div>
                  <label className="block text-xs sm:text-sm font-extrabold text-gray-800 mb-1.5">
                    Your Name
                  </label>
                  <div className="relative">
                    <User className="w-5 h-5 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      name="customerName"
                      placeholder="e.g. Dawit Kebede"
                      value={customer.customerName}
                      onChange={handleCustomerChange}
                      className="w-full pl-11 pr-4 py-3 min-h-[48px] rounded-xl border-2 border-gray-200 text-base sm:text-sm font-semibold text-gray-950 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
                      required
                    />
                  </div>
                </div>

                {/* Phone Input */}
                <div>
                  <label className="block text-xs sm:text-sm font-extrabold text-gray-800 mb-1.5">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-5 h-5 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      name="phone"
                      placeholder="0911 234 567"
                      value={customer.phone}
                      onChange={handleCustomerChange}
                      className="w-full pl-11 pr-4 py-3 min-h-[48px] rounded-xl border-2 border-gray-200 text-base sm:text-sm font-semibold text-gray-950 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
                      required
                    />
                  </div>
                </div>

                {/* Location Input with Datalist */}
                <div>
                  <label className="block text-xs sm:text-sm font-extrabold text-gray-800 mb-1.5">
                    AASTU Dorm Block & Room
                  </label>
                  <div className="relative">
                    <MapPin className="w-5 h-5 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      list="blockOptions"
                      type="text"
                      name="location"
                      placeholder="e.g. Block 14, Room 204"
                      value={customer.location}
                      onChange={handleCustomerChange}
                      className="w-full pl-11 pr-4 py-3 min-h-[48px] rounded-xl border-2 border-gray-200 text-base sm:text-sm font-semibold text-gray-950 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
                      required
                    />
                    <datalist id="blockOptions">
                      {Array.from({ length: 28 }, (_, i) => (
                        <option key={i + 1} value={`Block ${i + 1}`} />
                      ))}
                    </datalist>
                  </div>
                </div>
              </div>
            </div>

            {/* Food Items List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h2 className="font-extrabold text-base text-gray-950 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-amber-600" />
                  <span>Items Ordered ({items.length})</span>
                </h2>
                <span className="text-xs font-semibold text-gray-600">Customize below</span>
              </div>

              {items.map((item, index) => {
                const unitPrice = getUnitPrice(item);
                const lineTotal = unitPrice * (Number(item.quantity) || 1);

                return (
                  <div
                    key={index}
                    className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4 relative"
                  >
                    {/* Top Row: Food Select & Remove */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1">
                        <select
                          name="foodType"
                          value={item.foodType}
                          onChange={(e) => handleItemChange(index, e)}
                          className="w-full px-3.5 py-3 min-h-[48px] rounded-xl border-2 border-gray-200 font-extrabold text-base sm:text-sm text-gray-950 bg-gray-50/70 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition cursor-pointer"
                        >
                          {getSelectableFoodTypes().map((foodType) => (
                            <option key={foodType} value={foodType}>
                              {FOOD_TYPE_LABELS[foodType]}
                            </option>
                          ))}
                        </select>
                      </div>

                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="w-11 h-11 rounded-xl text-gray-500 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition cursor-pointer shrink-0"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
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
                              Normal ({pricing.ertibNormalPrice} Birr)
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
                              Special ({pricing.ertibSpecialPrice} Birr)
                            </button>
                          </div>
                        </div>

                        {/* Seasoning & Extras Pill Toggles */}
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                            Seasoning & Extras
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
                              {item.spices ? "✓ Spices" : "No Spices"}
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
                              {item.ketchup ? "✓ Ketchup" : "No Ketchup"}
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
                              + Extra Ketchup (+{pricing.extraKetchupPrice} Birr)
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
                              + Double Felafil (+{pricing.doubleFelafilPrice} Birr)
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* FETIRA CUSTOMIZATION */}
                    {item.foodType === "fetira" && (
                      <div className="space-y-2 pt-1">
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                          Extra Eggs (+{pricing.fetiraExtraEggPrice} Birr / egg)
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
                              {num === 0 ? "Standard (3)" : `+${num} Egg${num > 1 ? "s" : ""}`}
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
                  </div>
                );
              })}

              {/* Add Another Item Button */}
              <button
                type="button"
                onClick={addItem}
                className="w-full min-h-[50px] py-3.5 border-2 border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/60 hover:bg-amber-100/60 rounded-2xl text-amber-900 font-extrabold text-sm sm:text-base transition flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98"
              >
                <Plus className="w-4 h-4 text-amber-600" />
                <span>Add Another Food Item</span>
              </button>
            </div>

            {/* Total & Review CTA Bar (Mobile First: Sticky bar on mobile, card on desktop) */}
            <div className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-xl -mx-4 px-4 py-3.5 sm:static sm:mx-0 sm:p-5 sm:rounded-3xl sm:border sm:border-gray-100 sm:shadow-sm space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-gray-600 block">
                    Total Amount
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-amber-950 leading-none">
                    {orderTotal}{" "}
                    <span className="text-xs sm:text-sm text-amber-800 font-bold">Birr</span>
                  </span>
                </div>

                <button
                  type="submit"
                  className="min-h-[48px] py-3 px-5 sm:px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-extrabold text-sm sm:text-base shadow-md shadow-amber-200/60 transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer ml-auto"
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
                Review Your Order
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 font-medium mt-0.5">
                Please verify your delivery location and items before confirming
              </p>
            </div>

            {/* Delivery Recipient Summary */}
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-xs sm:text-sm space-y-1.5">
              <p className="font-black text-gray-950 text-sm sm:text-base">
                Recipient: {customer.customerName}
              </p>
              <p className="text-gray-800 font-semibold">Phone: {customer.phone}</p>
              <p className="text-gray-800 font-bold">
                Dorm Location: <span className="text-amber-900">{customer.location}</span>
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
                className="w-full sm:flex-1 min-h-[50px] py-3.5 px-4 rounded-2xl bg-white hover:bg-gray-100 active:bg-gray-200 text-gray-900 border-2 border-gray-200 font-extrabold text-sm transition cursor-pointer active:scale-98 flex items-center justify-center"
              >
                Back & Edit
              </button>

              <button
                type="button"
                onClick={handleConfirmOrder}
                disabled={loading}
                className="w-full sm:flex-1 min-h-[50px] py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-extrabold text-sm shadow-md shadow-amber-200/60 transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 disabled:opacity-60"
              >
                {loading ? (
                  <span>Placing Order...</span>
                ) : (
                  <>
                    <span>Confirm Order</span>
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
