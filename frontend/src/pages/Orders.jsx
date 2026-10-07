import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AiOutlineClose } from "react-icons/ai";
import { FiCopy, FiArrowLeft } from "react-icons/fi";
import { FaPaperPlane } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Bike, ArrowRight, Sparkles } from "lucide-react";
import Toast from "./Toast";
import API from "../api";
import { getSocket } from "../socket";
import PaymentInstructionsCard from "../components/PaymentInstructionsCard";
import PushNotificationPrompt from "../components/PushNotificationPrompt";
import { maskTrackingCode } from "../notificationStore";

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

// Post-Order Celebratory Splash Modal with Auto-Transition
function OrderSuccessModal({ order, onTrackNow, buildManualOrderSmsMessage }) {
  const [countdown, setCountdown] = useState(2);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onTrackNow();
          return 0;
        }
        return prev - 1;
      });
    }, 900);

    return () => clearInterval(timer);
  }, [onTrackNow]);

  const maskedCode = maskTrackingCode(order.trackingCode);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.85, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 text-center border border-gray-100 overflow-hidden"
      >
        {/* Animated Celebration Icon */}
        <div className="relative mx-auto mb-4 w-20 h-20 flex items-center justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.1, damping: 15 }}
            className="w-20 h-20 rounded-full bg-linear-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-200"
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
        <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
          Order Placed Successfully!
        </h2>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">
          We've received your order and sent it to the kitchen.
        </p>

        {/* Order Details Strip */}
        <div className="mt-5 p-3.5 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between">
          <div className="text-left">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block">
              Tracking Code
            </span>
            <span className="font-mono text-sm sm:text-base font-bold text-gray-900">
              {maskedCode}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block">
              Total Amount
            </span>
            <span className="text-sm sm:text-base font-extrabold text-amber-900">
              {order.total} <span className="text-xs text-amber-700">Birr</span>
            </span>
          </div>
        </div>

        {/* Auto-redirect progress bar & indicator */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5 font-medium">
            <span>Redirecting to live tracking...</span>
            <span className="font-bold text-amber-800">{countdown}s</span>
          </div>
          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.8, ease: "linear" }}
              className="h-full bg-linear-to-r from-amber-500 to-emerald-500 rounded-full"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 space-y-2.5">
          <button
            type="button"
            onClick={onTrackNow}
            className="w-full py-3 px-5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm sm:text-base shadow-lg shadow-amber-200 transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Bike className="w-5 h-5" />
            <span>Track Your Order Now</span>
            <ArrowRight className="w-4 h-4 ml-0.5" />
          </button>

          {/* Admin SMS Quick Trigger */}
          {order.createdByAdmin && order.customerPhone && (
            <button
              type="button"
              onClick={() => {
                const messageToSend = buildManualOrderSmsMessage(order);
                const smsUrl = `sms:${order.customerPhone}?body=${encodeURIComponent(messageToSend)}`;
                window.location.href = smsUrl;
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <FaPaperPlane className="text-xs" />
              <span>Send Order SMS to Customer</span>
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
    const fetchPricing = async () => {
      try {
        const res = await API.get("/orders/pricing");
        if (res.data) {
          setPricing((prev) => ({ ...prev, ...res.data }));
        }
      } catch (err) {
        console.error("❌ Failed to load pricing:", err);
      }
    };

    fetchPricing();
  }, []);

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const res = await API.get("/availability");
        if (res.data) {
          setItemAvailability({
            ...DEFAULT_ITEM_AVAILABILITY,
            ...(res.data.itemAvailability || {}),
          });
        }
      } catch (err) {
        console.error("❌ Failed to load item availability:", err);
      }
    };

    fetchAvailability();
  }, []);

  useEffect(() => {
    const socket = getSocket();

    const handlePricingUpdated = async (payload) => {
      if (payload && typeof payload === "object") {
        setPricing((prev) => ({ ...prev, ...payload }));
        return;
      }

      try {
        const res = await API.get("/orders/pricing");
        if (res.data) {
          setPricing((prev) => ({ ...prev, ...res.data }));
        }
      } catch (err) {
        console.error("❌ Failed to refresh pricing:", err);
      }
    };

    socket.on("pricing:updated", handlePricingUpdated);

    const handleAvailabilityUpdated = (payload) => {
      if (payload && typeof payload === "object") {
        setItemAvailability({
          ...DEFAULT_ITEM_AVAILABILITY,
          ...(payload.itemAvailability || {}),
        });
      }
    };

    socket.on("availability:updated", handleAvailabilityUpdated);

    return () => {
      socket.off("pricing:updated", handlePricingUpdated);
      socket.off("availability:updated", handleAvailabilityUpdated);
    };
  }, []);

  useEffect(() => {
    if (user?.role === "admin") return;

    const fallbackFoodType =
      Object.keys(DEFAULT_ITEM_AVAILABILITY).find(
        (foodType) => itemAvailability[foodType] !== false,
      ) || "ertib";

    let changed = false;
    const nextItems = items.map((item) => {
      const isAvailable = itemAvailability[item.foodType] !== false;
      if (isAvailable) return item;
      changed = true;
      return buildDefaultItem(fallbackFoodType);
    });

    if (changed) {
      setItems(nextItems);
      setMessage(
        "One or more items were unavailable and were replaced with available options.",
      );
    }
  }, [itemAvailability, user?.role, items]);

  // Prefill when editing
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get("edit");
    if (!code) return;

    const fetchForEdit = async () => {
      try {
        const res = await API.get(`/orders/track/${code}/edit`);
        const o = res.data;
        if (o) {
          setCustomer({
            customerName: o.customerName || "",
            phone: o.phone || "",
            location: o.location || "",
          });

          // Ensure each item has foodType (backwards compatibility)
          const safeItems =
            o.items && o.items.length
              ? o.items.map((it) => ({
                  ...buildDefaultItem(it.foodType || "ertib"),
                  ...it,
                  quantity:
                    typeof it.quantity === "number"
                      ? it.quantity
                      : +it.quantity || 1,
                  extraEggs:
                    typeof it.extraEggs === "number"
                      ? it.extraEggs
                      : +it.extraEggs || 0,
                  defaultEggs:
                    typeof it.defaultEggs === "number"
                      ? it.defaultEggs
                      : FETIRA_DEFAULT_EGGS,
                  donutPairsPerPackage:
                    typeof it.donutPairsPerPackage === "number"
                      ? it.donutPairsPerPackage
                      : +it.donutPairsPerPackage || 1,
                }))
              : items;

          setItems(safeItems);
          setEditMode(true);
          setEditCode(code);
          setMessage("Editing existing order — update values and confirm.");
        }
      } catch (err) {
        console.error("Failed to load order for edit:", err);
        setMessage(
          err.response?.data?.message || "Failed to load order for edit.",
        );
      }
    };

    fetchForEdit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setCustomer({ customerName: "", phone: "", location: "" });
  };

  // Pricing logic
  const getUnitPrice = (item) => {
    if (item.foodType === "sambusa") return Number(pricing.sambusaPrice) || 0;
    if (item.foodType === "boiled_egg") {
      return (
        Number(pricing.boiledEggPrice) || Number(pricing.sambusaPrice) || 0
      );
    }
    if (item.foodType === "fetira") {
      const base = Number(pricing.fetiraBasePrice) || 0;
      const extraEggPrice = Number(pricing.fetiraExtraEggPrice) || 0;
      const extraEggs = Math.max(0, Number(item.extraEggs) || 0);
      return base + extraEggPrice * extraEggs;
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

  // Handle customer input
  const handleCustomerChange = (e) => {
    const { name, value } = e.target;
    setCustomer((prev) => ({ ...prev, [name]: value }));
  };

  // Handle item changes robustly
  const handleItemChange = (index, e) => {
    const { name, value, type, checked } = e.target;

    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;

        // If changing the food type, reset ertib-specific fields when switching away from ertib
        if (name === "foodType") {
          if (user?.role !== "admin" && itemAvailability[value] === false) {
            setMessage(
              `${FOOD_TYPE_LABELS[value] || "This item"} is currently unavailable.`,
            );
            return item;
          }

          const nextDefaults = buildDefaultItem(value);
          return {
            ...nextDefaults,
            quantity: Number(item.quantity) || 1,
          };
        }

        // Handle number input properly
        if (type === "number") {
          const num = Number(value || 0);
          return { ...item, [name]: num };
        }

        // Handle checkbox
        if (type === "checkbox") {
          return { ...item, [name]: !!checked };
        }

        // Normal text/select values
        return { ...item, [name]: value };
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
    if (user?.role === "admin") return allFoodTypes;

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
      const defaultEggs = Number(item.defaultEggs) || FETIRA_DEFAULT_EGGS;
      const extraEggs = Math.max(0, Number(item.extraEggs) || 0);
      const extraLabel =
        extraEggs > 0
          ? ` + ${extraEggs} extra egg${extraEggs > 1 ? "s" : ""}`
          : "";
        if(!extraLabel) {
          return `${item.quantity} × Fetira`;
        }
        else {
          return `${item.quantity} × Fetira (${extraLabel})`;
        }
    }

    if (item.foodType === "donut") {
      const pairs = Number(item.donutPairsPerPackage) || 1;
      const packages = Number(item.quantity) || 0;
      const totalDonuts = pairs * packages * 2;
      return `${packages} × Donut package (${pairs} pairs/package, total donuts: ${totalDonuts})`;
    }

    let desc = `${item.quantity} × ${item.ertibType} Ertib`;

    // Spices and ketchup
    if (item.spices && item.ketchup) desc += " with both spices and ketchup";
    else if (item.spices && !item.ketchup) desc += " with only spices";
    else if (!item.spices && item.ketchup) desc += " with only ketchup";
    else desc += " without ketchup and spices";

    // Extra ketchup
    if (item.extraKetchup) desc += " + extra ketchup";

    // Felafil
    if (item.doubleFelafil) desc += " + double felafil";
    else if (item.Felafil === false) desc += " + no felafil";

    return desc;
  };

  const handleReview = (e) => {
    e.preventDefault();
    setReviewMode(true);
  };

  const handleConfirmOrder = async ({ forceCreateDuplicate = false } = {}) => {
    if (user?.role !== "admin") {
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

    // ensure numeric quantities and compute line totals
    const itemList = items.map((item) => {
      const sanitized = {
        ...item,
        quantity: Number(item.quantity) || 0,
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

        setTracking({
          trackingCode: updated.trackingCode || editCode,
          trackingLink: updated.trackUrl,
          createdByAdmin: updated.userRole === "admin",
          customerPhone: updated.phone,
          paymentStatus: updated.paymentStatus || "unpaid",
          total: updated.total ?? total,
        });

        setEditMode(false);
        setEditCode(null);
        navigate(`/track/${updated.trackingCode || editCode}`);
      } else {
        let endpoint = "/orders";
        const headers = {};

        if (user?.role === "admin") {
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

        const orderSummary = {
          trackingCode: finalTrackingCode,
          trackingLink: orderData.trackUrl,
          createdByAdmin: user?.role === "admin",
          customerPhone: finalPhone,
          paymentStatus: orderData.paymentStatus || "unpaid",
          total: orderData.total ?? total,
        };

        setOrderSuccessModal(orderSummary);
        setTracking(orderSummary);
      }

      // Reset form after success
      setCustomer({ customerName: "", phone: "", location: "" });
      setItems([buildDefaultItem("ertib")]);
      setReviewMode(false);
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

  const handleEditPreviousOrder = (trackingCode) => {
    if (!trackingCode) return;
    setReviewMode(false);
    setTracking(null);
    setDuplicateOrderHint(null);
    setMessage("Loading previous order for edit...");
    navigate(`/order?edit=${trackingCode}`);
  };

  const handleTrackNow = (targetCode = orderSuccessModal?.trackingCode) => {
    if (!targetCode) return;
    navigate(`/track/${encodeURIComponent(targetCode)}?justPlaced=1`, {
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

  const getMessageMeta = (msg) => {
    if (!msg) return { container: "", icon: "" };
    const lower = msg.toLowerCase();
    if (lower.includes("successfully")) {
      return {
        container: "bg-green-100 text-green-800 border border-green-300",
        icon: "✅",
      };
    }

    if (
      lower.includes("failed") ||
      lower.includes("error") ||
      lower.includes("invalid") ||
      lower.includes("not found")
    ) {
      return {
        container: "bg-red-100 text-red-800 border border-red-300",
        icon: "❌",
      };
    }

    return {
      container: "bg-amber-100 text-amber-800 border border-amber-300",
      icon: "ℹ️",
    };
  };

  const msgMeta = getMessageMeta(message);

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-start p-6 bg-linear-to-br from-amber-600 via-orange-500 to-red-600">
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-4 sm:mb-6">
        <div>
          {user?.role === "admin" ? (
            <Link
              to="/admin"
              className="px-5 py-3 bg-white/20 backdrop-blur-md border border-white text-white rounded-full hover:bg-white/30 transition text-sm sm:text-base"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              to="/"
              className="fixed top-4 left-4 z-50 inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-full shadow-lg transition-all duration-200"
            >
              <FiArrowLeft className="text-lg" />
              Back
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* {!user ? (
            <Link
              to="/login"
              className="px-5 py-3 bg-white/20 backdrop-blur-md border border-white text-white rounded-full hover:bg-white/30 transition text-sm sm:text-base"
            >
              Login
            </Link>
          ) : (
            <>
              <span className="text-white font-medium text-sm sm:text-base">
                Hi, {user.name}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition text-sm sm:text-base"
              >
                Logout
              </button>
            </>
          )} */}
        </div>
      </div>

      {/* Order Form Card */}
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        <div className="bg-white/90 backdrop-blur-lg shadow-2xl rounded-2xl p-6 sm:p-8 w-full max-w-lg border border-white/30">
          {/* Message */}
          {message && (
            <div
              className={`mt-4 w-full max-w-lg mx-auto p-4 rounded-lg text-sm font-medium flex items-center justify-between gap-2 ${msgMeta.container}`}
            >
              <div className="flex items-center gap-2">
                <span>{msgMeta.icon}</span>
                <span>{message}</span>
              </div>
              <button
                onClick={() => setMessage("")}
                className="text-gray-500 hover:text-gray-700"
              >
                <AiOutlineClose size={18} />
              </button>
            </div>
          )}

          {duplicateOrderHint?.trackingCode && (
            <div className="mt-3 w-full max-w-lg mx-auto p-4 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-sm">
              <div className="font-semibold mb-1">
                Possible duplicate order detected
              </div>
              <p className="mb-3">
                An active recent order already exists for this phone number. You
                can edit that order instead of creating a new one.
              </p>

              <div className="mb-3">
                <span className="font-medium">Tracking code:</span>{" "}
                <span className="bg-amber-100 px-2 py-1 rounded">
                  {duplicateOrderHint.trackingCode}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleEditPreviousOrder(duplicateOrderHint.trackingCode)
                  }
                  className="px-3 py-2 rounded-lg bg-amber-700 text-white hover:bg-amber-800 transition"
                >
                  Edit Previous Order
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/track/${duplicateOrderHint.trackingCode}`)
                  }
                  className="px-3 py-2 rounded-lg border border-amber-700 text-amber-800 hover:bg-amber-100 transition"
                >
                  View Previous Order
                </button>
                {user?.role === "admin" && (
                  <button
                    type="button"
                    onClick={() =>
                      handleConfirmOrder({ forceCreateDuplicate: true })
                    }
                    disabled={loading}
                    className="px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-60"
                  >
                    {loading ? "Creating..." : "Create Anyway (Admin)"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Post-Order Celebratory Splash Modal */}
          <AnimatePresence>
            {orderSuccessModal && (
              <OrderSuccessModal
                order={orderSuccessModal}
                buildManualOrderSmsMessage={buildManualOrderSmsMessage}
                onTrackNow={() => handleTrackNow(orderSuccessModal.trackingCode)}
              />
            )}
          </AnimatePresence>

          <h1 className="text-2xl font-bold mb-6 text-center text-amber-700">
            Place Your Order
          </h1>

          {!reviewMode ? (
            <form onSubmit={handleReview} className="space-y-5">
              <input
                type="text"
                name="customerName"
                placeholder="Your Name"
                value={customer.customerName}
                onChange={handleCustomerChange}
                className="w-full border p-2 rounded-lg"
                required
              />

              <input
                type="text"
                name="phone"
                placeholder="Phone Number"
                value={customer.phone}
                onChange={handleCustomerChange}
                className="w-full border p-2 rounded-lg"
                required
              />

              {/* Editable Location Input with Block 1–18 Options */}
              <input
                list="blockOptions"
                type="text"
                name="location"
                placeholder="Delivery Location (e.g. Block14)"
                value={customer.location}
                onChange={handleCustomerChange}
                className="w-full border p-2 rounded-lg"
                required
              />

              <datalist id="blockOptions">
                {Array.from({ length: 28 }, (_, i) => (
                  <option key={i + 1} value={`Block ${i + 1}`} />
                ))}
              </datalist>
              <div className="border-t pt-4 space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="border p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <h2 className="font-semibold text-amber-700">
                        Item #{index + 1}
                      </h2>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-600 text-sm hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    {/* Food type selector (Option A) */}
                    <select
                      name="foodType"
                      value={item.foodType}
                      onChange={(e) => handleItemChange(index, e)}
                      className="w-full border p-2 rounded-lg mb-3"
                    >
                      {getSelectableFoodTypes().map((foodType) => {
                        const isAvailable =
                          itemAvailability[foodType] !== false;
                        return (
                          <option key={foodType} value={foodType}>
                            {FOOD_TYPE_LABELS[foodType]}
                          </option>
                        );
                      })}
                    </select>

                    {itemAvailability[item.foodType] === false && (
                      <div className="mb-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
                        {FOOD_TYPE_LABELS[item.foodType] || "This item"} is
                        currently unavailable.
                      </div>
                    )}

                    {/* Ertib options — only show when foodType === 'ertib' */}
                    {item.foodType === "ertib" && (
                      <>
                        <select
                          name="ertibType"
                          value={item.ertibType}
                          onChange={(e) => handleItemChange(index, e)}
                          className="w-full border p-2 rounded-lg"
                        >
                          <option value="normal">Normal</option>
                          <option value="special">Special</option>
                        </select>

                        <div className="grid grid-cols-2 gap-3 text-sm mt-3">
                          {[
                            "Felafil",
                            "ketchup",
                            "spices",
                            "extraKetchup",
                            "doubleFelafil",
                          ].map((field) => (
                            <label
                              key={field}
                              className="flex items-center space-x-2"
                            >
                              <input
                                type="checkbox"
                                name={field}
                                checked={!!item[field]}
                                onChange={(e) => handleItemChange(index, e)}
                              />
                              <span>
                                {field.replace(/([A-Z])/g, " $1").trim()}
                              </span>
                            </label>
                          ))}
                        </div>
                      </>
                    )}

                    {item.foodType === "fetira" && (
                      <div className="mt-2 space-y-3">
                        {/* <div className="text-sm text-gray-700">
                          <strong>Default eggs included:</strong>{" "}
                          {FETIRA_DEFAULT_EGGS}
                        </div> */}
                        <div>
                          <label className="block font-medium">
                            Extra Eggs:
                          </label>
                          <input
                            type="number"
                            name="extraEggs"
                            min="0"
                            value={item.extraEggs ?? 0}
                            onChange={(e) => handleItemChange(index, e)}
                            className="w-full border p-2 rounded-lg"
                          />
                        </div>
                      </div>
                    )}

                    {item.foodType === "donut" && (
                      <div className="mt-2 space-y-3">
                        <div>
                          <label className="block font-medium">
                            Package Size (pairs):
                          </label>
                          <select
                            name="donutPairsPerPackage"
                            value={item.donutPairsPerPackage ?? 1}
                            onChange={(e) => handleItemChange(index, e)}
                            className="w-full border p-2 rounded-lg"
                          >
                            {DONUT_PACKAGE_OPTIONS.map((pairs) => (
                              <option key={pairs} value={pairs}>
                                {pairs} pairs per package
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Quantity — always visible for both food types */}
                    <div className="mt-3">
                      <label className="block font-medium">
                        {item.foodType === "donut"
                          ? "Quantity (packages):"
                          : "Quantity:"}
                      </label>
                      <input
                        type="number"
                        name="quantity"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, e)}
                        className="w-full border p-2 rounded-lg"
                      />
                    </div>

                    <div className="flex justify-between text-sm mt-2">
                      <span>Unit: {getUnitPrice(item)} Birr</span>
                      <span>
                        Line Total: {getUnitPrice(item) * item.quantity} Birr
                      </span>
                    </div>

                    {item.foodType === "donut" && (
                      <div className="text-sm mt-2 text-gray-700">
                        Total donuts:{" "}
                        {(Number(item.donutPairsPerPackage) || 1) *
                          (Number(item.quantity) || 0) *
                          2}
                      </div>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addItem}
                  className="w-full border border-amber-700 text-amber-700 py-2 rounded-lg hover:bg-amber-700 hover:text-white transition"
                >
                  + Add Another Item
                </button>
              </div>

              <div className="text-right text-sm font-semibold text-gray-700">
                Total:{" "}
                {items.reduce(
                  (sum, item) =>
                    sum + getUnitPrice(item) * Number(item.quantity || 0),
                  0,
                )}{" "}
                Birr
              </div>

              <button
                type="submit"
                className="w-full bg-amber-700 text-white py-2 rounded-lg hover:bg-amber-800 transition"
              >
                Review Order
              </button>
            </form>
          ) : (
            <div>
              <h2 className="text-lg font-semibold mb-4 text-gray-700">
                Review Your Order
              </h2>

              <div className="space-y-3">
                {items.map((item, i) => (
                  <p key={i} className="border p-2 rounded-lg text-sm">
                    {describeItem(item)} —{" "}
                    <strong>{getUnitPrice(item) * item.quantity} Birr</strong>
                  </p>
                ))}
              </div>

              <div className="text-right mt-4 font-semibold text-gray-700">
                Total:{" "}
                {items.reduce(
                  (sum, item) =>
                    sum + getUnitPrice(item) * Number(item.quantity || 0),
                  0,
                )}{" "}
                Birr
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleBack}
                  className="flex-1 border border-gray-400 py-2 rounded-lg hover:bg-gray-100"
                >
                  Back & Edit
                </button>
                <button
                  onClick={handleConfirmOrder}
                  disabled={loading}
                  className="flex-1 bg-amber-700 text-white py-2 rounded-lg hover:bg-amber-800 transition"
                >
                  {loading
                    ? "Placing..."
                    : editMode
                      ? "Update Order"
                      : "Confirm Order"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
