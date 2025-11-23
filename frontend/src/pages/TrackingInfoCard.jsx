import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiInfo,
  FiEdit,
  FiTrash2,
  FiCheckCircle,
  FiXCircle,
  FiCheck,
  FiX,
} from "react-icons/fi";
import API from "../api";
import { motion, AnimatePresence } from "framer-motion";

// Simple Toast component
function Toast({ message, type = "success", onClose, duration = 3000 }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const colors = {
    success: "bg-green-500 text-white",
    error: "bg-red-500 text-white",
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className={`fixed top-5 right-5 px-4 py-2 rounded shadow-lg ${colors[type]} z-50`}
      >
        <div className="flex justify-between items-center">
          <span>{message}</span>
          <button
            onClick={onClose}
            className="ml-2 p-1 rounded hover:bg-white/20 transition"
          >
            <FiX className="text-sm" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Cancel Confirmation Modal
function CancelModal({ onConfirm, onCancel }) {
  const [inputValue, setInputValue] = useState("");
  const [shake, setShake] = useState(false);

  const handleConfirm = () => {
    if (inputValue.trim() === "cancel") {
      onConfirm();
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  const isReadyToConfirm = inputValue.trim() === "cancel";

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0 }}
        className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full text-center"
      >
        <h3 className="font-semibold text-lg mb-4 text-red-600">
          Cancel Your Order
        </h3>
        <p className="text-gray-700 mb-4">
          You are about to{" "}
          <span className="font-bold text-red-500">cancel your order</span>.
          This action{" "}
          <span className="font-bold text-red-500">cannot be undone</span>. To
          confirm, type <span className="font-bold text-red-500">'cancel'</span>{" "}
          below.
        </p>

        {/* Input with shake animation and checkmark */}
        <div className="relative w-full mb-4">
          <motion.input
            type="text"
            placeholder="Type 'cancel' to confirm"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            animate={shake ? { x: [-5, 5, -5, 5, 0] } : { x: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 text-center placeholder:text-center"
          />
          {isReadyToConfirm && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500"
            >
              <FiCheck className="text-lg" />
            </motion.div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <motion.button
            onClick={handleConfirm}
            animate={isReadyToConfirm ? { scale: [1, 1.05, 1] } : { scale: 1 }}
            transition={{
              duration: 0.5,
              repeat: isReadyToConfirm ? Infinity : 0,
            }}
            className="flex-1 flex items-center justify-center gap-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
          >
            <FiCheckCircle className="text-sm" /> Confirm
          </motion.button>
          <button
            onClick={onCancel}
            className="flex-1 flex items-center justify-center gap-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-black rounded-lg transition"
          >
            <FiXCircle className="text-sm" /> Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function TrackingInfoCard({ order, hideCustomerWhenManual }) {
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [currentOrder, setCurrentOrder] = useState(order);

  const statusSteps = ["pending", "in_progress", "arrived", "delivered"];
  const currentIndex = statusSteps.indexOf(currentOrder.status);
  const isManual =
    (currentOrder?.source || "").toString().trim().toLowerCase() === "manual";

  const statusMessages = {
    pending: "✅ Your order has been received.",
    in_progress: "👩‍🍳 Your order is being prepared.",
    arrived: "🚴‍♂️ Your order is on the way!",
    delivered: "🎉 Your order has been delivered.",
  };

  const getUnitPrice = (item) => {
    let price = item.ertibType === "special" ? 135 : 110;
    if (item.extraKetchup) price += 10;
    if (item.extraFelafil) price += 15;
    return price;
  };

  const describeItem = (item) => {
    const qty = item.quantity || 1;
    const unitPrice = getUnitPrice(item);
    let desc = `${qty} × ${item.ertibType} Ertib`;
    if (item.spices && item.ketchup) desc += " with spices & ketchup";
    else if (item.spices) desc += " with only spices";
    else if (item.ketchup) desc += " with only ketchup";
    else desc += " with no ketchup or spices";
    if (item.extraKetchup) desc += ", extra ketchup";
    if (item.extraFelafil) desc += ", extra felafil";
    return desc;
  };

  const totalPrice =
    currentOrder.total ??
    currentOrder.items.reduce(
      (sum, item) => sum + getUnitPrice(item) * (item.quantity || 1),
      0
    );

  // Server time offset
  useEffect(() => {
    let mounted = true;
    const fetchServerDate = async () => {
      try {
        const res = await API.head("/");
        const dateHeader = res?.headers?.date || res?.headers?.Date;
        if (dateHeader && mounted) {
          const serverDate = new Date(dateHeader).getTime();
          const localNow = Date.now();
          setServerOffsetMs(serverDate - localNow);
        }
      } catch (err) {}
    };
    fetchServerDate();
    return () => {
      mounted = false;
    };
  }, []);

  const isBeforeCutoff = () => {
    const now = new Date(Date.now() + (serverOffsetMs || 0));
    const hrs = now.getHours();
    const mins = now.getMinutes();
    return !(hrs > 17 || (hrs === 17 && mins >= 30));
  };

  const handleEdit = () => {
    if (!isBeforeCutoff()) {
      setToast({
        message: "❌ Editing is only allowed before 5:30 PM",
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

  // ✅ Auto-refresh every 1 minute
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await API.get(`/orders/track/${currentOrder.trackingCode}`);
        setCurrentOrder(res.data);
      } catch (err) {
        console.error("❌ Failed to refresh order:", err);
      }
    }, 60000); // 60,000ms = 1 minute

    return () => clearInterval(interval);
  }, [currentOrder.trackingCode]);

  return (
    <motion.div
      className="mt-3 p-4 rounded-lg bg-gradient-to-r from-blue-50 to-white border border-blue-300 text-blue-800 shadow-lg"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* TOAST */}
      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>

      {/* Cancel Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <CancelModal
            onConfirm={handleCancel}
            onCancel={() => setShowCancelModal(false)}
          />
        )}
      </AnimatePresence>

      {/* ... rest of your order display UI ... */}
      <div className="font-semibold mb-3 text-lg">📦 Order Details</div>
      {!isManual && !hideCustomerWhenManual && currentOrder.customerName && (
        <div className="mb-1">
          <strong>Customer:</strong> {currentOrder.customerName}
        </div>
      )}
      {isManual && currentOrder.location && (
        <div className="mb-1">
          <strong>Location:</strong> {currentOrder.location}
        </div>
      )}

      {order.items?.length > 0 && (
        <div className="mt-3 p-3 bg-white rounded border border-gray-200 text-gray-800">
          <div className="font-semibold mb-2">🧾 Items Ordered</div>
          <div className="space-y-2">
            {order.items.map((item, idx) => (
              <div key={idx}>{describeItem(item)}</div>
            ))}
          </div>
          <div className="mt-3 text-right font-semibold text-gray-700">
            Total: {totalPrice} Birr
          </div>
        </div>
      )}

      {/* Status & Track Link */}
      <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <strong>Status:</strong> {order.status.replace("_", " ")}
        </div>
        {order.trackUrl && (
          <a
            href={order.trackUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-600 text-white text-xs sm:text-sm font-medium rounded hover:bg-blue-700 transition w-full sm:w-auto text-center"
          >
            🔗 Track Order
          </a>
        )}
      </div>

      {/* Horizontal Scrollable Progress Bar */}
      <div className="mt-4 overflow-x-auto py-2">
        <div className="inline-flex items-center gap-4 min-w-max">
          {statusSteps.map((step, idx) => {
            const completed = idx < currentIndex;
            const current = idx === currentIndex;
            return (
              <div
                key={step}
                className="flex flex-col items-center relative min-w-[60px]"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3, delay: idx * 0.1 }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white z-10
                    ${
                      completed
                        ? "bg-green-500"
                        : current
                        ? "bg-green-500 animate-pulse"
                        : "bg-gray-300"
                    }`}
                >
                  {idx + 1}
                </motion.div>
                <span className="mt-1 text-xs text-center capitalize w-full">
                  {step.replace("_", " ")}
                </span>
                {idx < statusSteps.length - 1 && (
                  <div
                    className={`absolute top-4 left-1/2 w-full h-1 -translate-x-1/2 ${
                      completed ? "bg-green-500" : "bg-gray-300"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="relative h-1 bg-gray-300 rounded mt-3 w-full">
          <motion.div
            initial={{ width: 0 }}
            animate={{
              width: `${((currentIndex + 1) / statusSteps.length) * 100}%`,
            }}
            transition={{ duration: 0.8 }}
            className="absolute h-1 bg-green-500 rounded"
          />
        </div>
      </div>

      {/* Status Message */}
      <motion.div
        key={order.status}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="mt-3 p-2 bg-green-50 text-green-700 border border-green-100 rounded text-xs"
      >
        {statusMessages[order.status] || "Tracking your order..."}
      </motion.div>

      <div className="mt-2 text-xs text-gray-500">
        Placed on: {new Date(order.createdAt).toLocaleString()}
      </div>

      {/* Edit / Cancel Info Highlighted */}
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, repeat: 1 }}
        className="mt-2 p-2 bg-yellow-100 border-l-4 border-yellow-400 text-yellow-800 text-xs rounded flex items-center gap-2"
      >
        <FiInfo className="text-yellow-600" />
        You can edit or cancel your order before the cutoff time.
      </motion.div>

      {/* Edit / Cancel Buttons */}
      <div className="mt-4 flex gap-2 flex-wrap">
        <button
          disabled={!isBeforeCutoff()}
          onClick={handleEdit}
          className={`flex-1 min-w-[80px] px-3 py-1 text-xs font-medium rounded transition flex items-center justify-center gap-1 ${
            isBeforeCutoff()
              ? "bg-yellow-400 hover:bg-yellow-500 text-black"
              : "bg-gray-300 text-gray-600 cursor-not-allowed"
          }`}
        >
          <FiEdit className="text-sm" /> Edit
        </button>
        <button
          disabled={!isBeforeCutoff()}
          onClick={() => setShowCancelModal(true)}
          className={`flex-1 min-w-[80px] px-3 py-1 text-xs font-medium rounded transition flex items-center justify-center gap-1 ${
            isBeforeCutoff()
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-gray-300 text-gray-600 cursor-not-allowed"
          }`}
        >
          <FiTrash2 className="text-sm" /> Cancel
        </button>
      </div>
    </motion.div>
  );
}
