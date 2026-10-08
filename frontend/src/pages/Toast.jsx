import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX } from "react-icons/fi";

function Toast({ message, type = "success", onClick, onClose, duration = 3000 }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const colors = {
    success: "bg-emerald-600 text-white",
    error: "bg-red-500 text-white",
    info: "bg-blue-600 text-white",
    payment: "bg-amber-600 text-white",
  };

  const handleContainerClick = (e) => {
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.25 }}
        onClick={handleContainerClick}
        className={`fixed top-5 right-4 left-4 sm:left-auto sm:right-5 max-w-[calc(100vw-2rem)] sm:max-w-md px-4 py-3 rounded-2xl shadow-2xl ${
          colors[type] || colors.info
        } z-50 ${onClick ? "cursor-pointer hover:brightness-105 active:scale-98 transition-all" : ""}`}
      >
        <div className="flex justify-between items-center gap-3">
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold break-words leading-tight">{message}</span>
            {onClick && (
              <span className="block text-[11px] font-bold text-white/90 underline underline-offset-2 mt-0.5">
                Tap to view details →
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="shrink-0 p-1 rounded-lg hover:bg-white/20 transition cursor-pointer"
            title="Dismiss"
          >
            <FiX className="text-sm" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default Toast;
