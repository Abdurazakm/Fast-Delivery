import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX } from "react-icons/fi";

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
    info: "bg-blue-500 text-white",
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className={`fixed top-5 right-4 left-4 sm:left-auto sm:right-5 max-w-[calc(100vw-2rem)] sm:max-w-md px-4 py-2.5 rounded-xl shadow-xl ${colors[type]} z-50`}
      >
        <div className="flex justify-between items-center gap-2">
          <span className="text-sm font-medium break-words leading-tight">{message}</span>
          <button
            onClick={onClose}
            className="shrink-0 ml-2 p-1 rounded hover:bg-white/20 transition cursor-pointer"
          >
            <FiX className="text-sm" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default Toast;
