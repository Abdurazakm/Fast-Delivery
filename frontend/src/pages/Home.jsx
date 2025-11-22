import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AiOutlineClose } from "react-icons/ai";
import { FaPlus } from "react-icons/fa";
import { ArrowRight } from "lucide-react";
import API from "../api";
import dayjs from "dayjs";

export default function Home() {
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState("");
  const [serviceAvailable, setServiceAvailable] = useState(true);
  const navigate = useNavigate();

  // Track order state
  const [trackingCodeInput, setTrackingCodeInput] = useState("");
  const [trackingResult, setTrackingResult] = useState(null);
  const [trackingError, setTrackingError] = useState("");

  const handleTrackOrder = async () => {
    if (!trackingCodeInput.trim()) {
      setTrackingError("Please enter your tracking code.");
      setTrackingResult(null);
      return;
    }

    try {
      const res = await API.get(`/orders/track/${trackingCodeInput.trim()}`);
      setTrackingResult(res.data);
      setTrackingError("");
    } catch (err) {
      console.error("❌ Tracking error:", err);
      setTrackingResult(null);
      setTrackingError("Order not found or invalid tracking code.");
    }
  };

  // ✅ Check service availability (Mon–Thu until 5:30 PM)
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
          "⚠️ Service unavailable. We’re open only Monday to Thursday."
        );
      } else if (!beforeTime) {
        setServiceAvailable(false);
        setMessage(
          "⏰ Ordering time is over (after 5:30 PM). You can call us directly if we’re still at the Ertib place: +251954724664."
        );
      } else {
        setServiceAvailable(true);
        setMessage("");
      }
    };

    checkAvailability();
    const interval = setInterval(checkAvailability, 60000);
    return () => clearInterval(interval);
  }, []);

  // ✅ Fetch user info
  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await API.get("/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(res.data);
      } catch (err) {
        console.error("❌ Failed to load user:", err);
      }
    };
    fetchUser();
  }, []);

  // ✅ Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setMessage("Logged out successfully!");
  };

  // ✅ Safe order click handler (works for mobile & desktop)
  const handleOrderClick = () => {
    if (!serviceAvailable && user?.role !== "admin") {
      alert(
        "⚠️ Sorry! Ordering is not available right now.\n" +
          "We’re open Monday to Thursday until 5:30 PM."
      );
      return;
    }
    navigate("/order");
  };

  // Status steps for progress bar
  const statusSteps = ["pending", "in_progress", "arrived", "delivered"];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-amber-50 to-orange-100 p-6">
      {/* ✅ Top Right Auth Buttons */}
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

      {/* ✅ Availability Message (hide for admin) */}
      {user?.role !== "admin" && !serviceAvailable && message && (
        <div
          className="fixed top-4 z-50 left-2 right-2 sm:left-1/2 sm:-translate-x-1/2
                     p-4 bg-red-100/50 backdrop-blur-sm text-red-800 border border-red-300/40
                     rounded-xl flex justify-between items-start max-w-md shadow-lg"
        >
          <span className="text-lg font-medium">{message}</span>
          <button onClick={() => setMessage("")} className="text-red-800">
            <AiOutlineClose size={20} />
          </button>
        </div>
      )}

      {/* ✅ Hero */}
      <div className="text-center max-w-2xl mt-6">
        <h1 className="text-3xl md:text-4xl font-bold mb-4 text-amber-700">
          👋 Welcome To Fast Delivery Service!
        </h1>

        <p className="text-gray-700 mb-3 text-lg">
          We deliver{" "}
          <span className="font-semibold text-amber-700">Leyla’s Ertib</span>{" "}
          straight from
          <span className="font-semibold"> Tuludimtu</span> to your dorm —
          exclusively for
          <span className="font-semibold"> AASTU students</span>! 🚴‍♂️
        </p>

        {/* ✅ Order + Dashboard buttons grouped */}
        <div className="flex flex-row items-center justify-center gap-4 mt-6 w-full">
          {/* ORDER BUTTON */}
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

          {/* DASHBOARD BUTTON (Admin Only) */}
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

      {/* ✅ Track Order Section */}
<div className="mt-10 max-w-md w-full mx-auto bg-white p-6 rounded-2xl shadow text-center">
  <h3 className="font-semibold text-lg mb-3 text-amber-700">Track Your Order</h3>

  <div className="flex gap-2 mb-3">
    <input
      type="text"
      placeholder="Enter your tracking code"
      value={trackingCodeInput}
      onChange={(e) => setTrackingCodeInput(e.target.value)}
      className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
    />
    <button
      onClick={handleTrackOrder}
      className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
    >
      Track
    </button>
  </div>

  {trackingError && <div className="text-red-600 text-sm">{trackingError}</div>}

  {trackingResult && (
    <div className="mt-3 p-4 rounded-lg bg-blue-50 border border-blue-300 text-blue-800 text-sm text-left">
      {/* Customer Info */}
      <div className="font-semibold mb-2">📦 Order Details</div>
      <div className="mb-1">
        <strong>Customer:</strong> {trackingResult.customerName}
      </div>
      <div className="mb-1">
        <strong>Status:</strong> {trackingResult.status.replace("_", " ")}
      </div>
      <div className="mb-1">
        <strong>Tracking Link:</strong>{" "}
        <a
          href={trackingResult.trackUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-blue-700"
        >
          {trackingResult.trackUrl}
        </a>
      </div>

      {/* ✅ Responsive Horizontal Progress Steps */}
      {(() => {
        const statusSteps = ["pending", "in_progress", "arrived", "delivered"];
        const currentIndex = statusSteps.indexOf(trackingResult.status);

        return (
          <div className="mt-4 overflow-x-auto">
            <div className="flex items-center space-x-4 min-w-max">
              {statusSteps.map((status, idx) => {
                const isCompleted = idx < currentIndex;
                const isCurrent = idx === currentIndex;
                return (
                  <div key={status} className="flex flex-col items-center relative">
                    {/* Circle */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white z-10 
                        ${isCompleted ? "bg-green-500" : isCurrent ? "bg-green-500 animate-pulse" : "bg-gray-300"}`}
                    >
                      {idx + 1}
                    </div>
                    {/* Label */}
                    <span className="mt-1 text-xs text-center capitalize w-20">
                      {status.replace("_", " ")}
                    </span>

                    {/* Connecting Line */}
                    {idx < statusSteps.length - 1 && (
                      <div
                        className={`absolute top-4 left-1/2 w-full h-1 -translate-x-1/2 ${
                          idx < currentIndex ? "bg-green-500" : "bg-gray-300"
                        } transition-all duration-700`}
                      ></div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Progress Bar */}
            <div className="relative h-1 bg-gray-300 rounded mt-3">
              <div
                className="absolute h-1 bg-green-500 rounded transition-all duration-700 ease-in-out"
                style={{
                  width: `${((currentIndex + 1) / statusSteps.length) * 100}%`,
                }}
              ></div>
            </div>
          </div>
        );
      })()}

      {/* ✅ Status Message */}
      <div className="mt-2 p-2 bg-green-50 text-green-700 rounded border border-green-100 text-xs">
        {(() => {
          switch (trackingResult.status) {
            case "pending":
              return "✅ Your order has been received.";
            case "in_progress":
              return "👩‍🍳 Your order is being prepared.";
            case "arrived":
              return "🚴‍♂️ Your order is on the way!";
            case "delivered":
              return "🎉 Your order has been delivered.";
            default:
              return "Tracking your order...";
          }
        })()}
      </div>
    </div>
  )}
</div>


      {/* ✅ Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-4xl">
        <div className="bg-white p-6 rounded-2xl shadow text-center">
          <h3 className="font-semibold text-lg mb-1">Fast Campus Delivery</h3>
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
          <p className="text-gray-600 text-sm">
            Call{" "}
            <a
              href="tel:+251954724664"
              className="text-amber-700 font-semibold hover:underline"
            >
              +251954724664
            </a>
          </p>
        </div>
      </div>

      {/* ✅ Footer */}
      <footer className="mt-12 text-gray-600 text-sm text-center">
        © {new Date().getFullYear()} Fast Delivery Service — Exclusively for
        AASTU Students.
      </footer>
    </div>
  );
}
