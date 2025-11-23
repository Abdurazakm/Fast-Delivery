import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AiOutlineClose } from "react-icons/ai";
import { FaPlus } from "react-icons/fa";
import { FiPhoneCall } from "react-icons/fi";
import { createRoot } from "react-dom/client";
import { ArrowRight } from "lucide-react";
import API from "../api";
import TrackingInfoCard from "./TrackingInfoCard";
import Toast from "./Toast"; // import your reusable Toast component

export default function Home() {
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState("");
  const [serviceAvailable, setServiceAvailable] = useState(true);
  const [toast, setToast] = useState(null); // ✅ toast state
  const navigate = useNavigate();

  const [trackingCodeInput, setTrackingCodeInput] = useState("");
  const [trackingResult, setTrackingResult] = useState(null);
  const [trackingError, setTrackingError] = useState("");
  const [latestOrder, setLatestOrder] = useState(null);

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

        // 2️⃣ Fetch latest order for this user
        try {
          const resOrder = await API.get("/orders/latest", {
            headers: { Authorization: `Bearer ${token}` },
          });

          setLatestOrder(
            resOrder.data && Object.keys(resOrder.data).length > 0
              ? resOrder.data
              : null
          );
        } catch {
          setLatestOrder(null);
        }
      } catch (err) {
        console.error("❌ Failed to fetch user or order:", err);
        setUser(null);
        setLatestOrder(null);
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

  useEffect(() => {
    const checkAvailability = () => {
      const now = new Date();
      const day = now.getDay();
      const hour = now.getHours();
      const minute = now.getMinutes();

      const withinDays = day >= 1 && day <= 4;
      const beforeTime = hour < 17 || (hour === 17 && minute <= 30);

      if (!withinDays) {
        setServiceAvailable(false);
        setMessage(
          <span>
            ⚠️ Service unavailable. We’re open only Monday to Thursday.
          </span>
        );
      } else if (!beforeTime) {
        setServiceAvailable(false);
        setMessage(
          <span className="flex flex-col gap-1">
            ⏰ Ordering time is over (after 11:30 LT). You can call us directly
            if we’re still at the Ertib place:{" "}
            <a
              href="tel:+251954724664"
              className="flex items-center gap-2 underline text-blue-600 font-semibold mt-1"
            >
              <FiPhoneCall size={16} />
              +251 95 472 4664
            </a>
          </span>
        );
      } else {
        setServiceAvailable(true);
        setMessage(null);
      }
    };

    checkAvailability();
    const interval = setInterval(checkAvailability, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleOrderClick = () => {
    if (!serviceAvailable && user?.role !== "admin") {
      setToast({
        message:
          "⚠️ Sorry! Ordering is not available right now.\nWe’re open Monday to Thursday until 5:30 PM.",
        type: "error",
      });
      return;
    }
    navigate("/order");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setToast({ message: "Logged out successfully!", type: "success" });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-amber-50 to-orange-100 p-6">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {/* Top Right Auth Buttons */}
      <div className="w-full flex items-center justify-end max-w-6xl mb-6">
        {!user ? (
          <Link
            to="/login"
            className="px-5 py-2 bg-white/80 border border-white text-amber-800 font-semibold rounded-full hover:bg-white transition"
          >
            Login
          </Link>
        ) : (
          <>
            <span className="text-amber-800 font-medium mr-3">
              Hi, <span className="text-red-500">{user.name}</span>
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition"
            >
              Logout
            </button>
          </>
        )}
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
          👋 Welcome To Fetan Delivery Service!
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
              className="p-3 rounded-full bg-green-600 text-white shadow-md transition transform hover:scale-105 hover:shadow-xl hover:bg-green-700"
            >
              <FaPlus size={18} />
            </Link>
          ) : (
            <span className="relative group">
              <button
                onClick={handleOrderClick}
                className={`px-6 py-3 rounded-full transition transform shadow-lg ${
                  serviceAvailable
                    ? "bg-green-600 text-white hover:bg-green-700 hover:scale-105 hover:shadow-xl"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed opacity-70"
                }`}
              >
                {serviceAvailable ? (
                  <>🥙 {user ? "Place Your Order" : "Order Directly"}</>
                ) : (
                  <span className="invisible">
                    🥙 {user ? "Place Your Order" : "Order Directly"}
                  </span>
                )}
              </button>

              {!serviceAvailable && (
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold bg-gray-300 text-gray-500 cursor-not-allowed opacity-70 bg-opacity-50 rounded-full pointer-events-none">
                  Ordering not available now
                </span>
              )}
            </span>
          )}

          {user?.role === "admin" && (
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

      {/* Track Your Order */}
      {user?.role !== "admin" && (
        <div className="mt-10 max-w-md w-full mx-auto bg-white p-6 rounded-2xl shadow text-center">
          <h3 className="font-semibold text-lg mb-3 text-amber-700">
            Track Your Order
          </h3>

          {/* Authenticated users */}
          {user ? (
            <>
              {latestOrder ? (
                <TrackingInfoCard order={latestOrder} />
              ) : (
                <div className="text-gray-500 text-sm">No orders today.</div>
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

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-4xl">
        <div className="bg-white p-6 rounded-2xl shadow text-center">
          <h3 className="font-semibold text-lg mb-1">Fetan Campus Delivery</h3>
          <p className="text-gray-600 text-sm">
            We deliver your favorite Ertib quickly and fresh!
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow text-center">
          <h3 className="font-semibold text-lg mb-1">Exclusive for AASTU</h3>
          <p className="text-gray-600 text-sm">
            Only available for AASTU students.
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow text-center">
          <h3 className="font-semibold text-lg mb-1">Easy Contact</h3>
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
      <footer className="mt-12 text-gray-600 text-sm text-center">
        © {new Date().getFullYear()} Fetan Delivery Service — Exclusively for
        AASTU Students.
      </footer>
    </div>
  );
}
