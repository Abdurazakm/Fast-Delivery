import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AiOutlineClose } from "react-icons/ai";
import API from "../api";

export default function Home() {
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState("");
  const [serviceAvailable, setServiceAvailable] = useState(true);
  const navigate = useNavigate();

  // ✅ Check service availability (Mon–Thu before 12:00 PM)
  useEffect(() => {
    const checkAvailability = () => {
      const now = new Date();
      const day = now.getDay(); // Sunday = 0, Monday = 1, ..., Saturday = 6
      const hour = 11
      // Adjusting for UTC+4
      console.log(day);
      const minute = 30;

      const withinDays = day >= 1 && day <= 4; // Mon–Thu
      // const beforeTime = hour < 12 || (hour === 12 && minute === 0); // Before 12:00 PM
      const beforeTime = hour < 17 && minute >= 30; // Before 5:30 AM

      if (!withinDays) {
        setServiceAvailable(false);
        setMessage("⚠️ Service unavailable. We’re open only Monday to Thursday.");
      } else if (!beforeTime) {
        setServiceAvailable(false);
        setMessage(
          "⏰ Ordering time is over (after 12:00 AM). You can call us directly if we’re still at the Ertib place: +251954724664."
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

  // ✅ Fetch logged-in user info
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

  // ✅ Logout function
  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setMessage("Logged out successfully!");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-amber-50 to-orange-100 p-6">
      {/* ✅ Auth Buttons */}
      <div className="w-full flex items-center justify-between mb-6 max-w-6xl">
        {/* Left: Dashboard (admin only) */}
        <div>
          {user?.role === "admin" && (
            <Link
              to="/admin"
              className="px-5 py-2 bg-white/20 backdrop-blur-md border border-white text-white rounded-full hover:bg-white/30 transition"
            >
              Dashboard
            </Link>
          )}
        </div>

        {/* Right: Login / User */}
        <div className="flex items-center gap-3">
          {!user ? (
            <Link
              to="/login"
              className="px-5 py-2 bg-white/80 backdrop-blur-md border border-white text-amber-800 font-semibold rounded-full hover:bg-white/100 transition"
            >
              Login
            </Link>
          ) : (
            <>
              <span className="text-amber-800 font-medium">
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
      </div>

      {/* ✅ Availability Message */}
      {!serviceAvailable && message && (
        <div
          className="fixed top-4 z-50
                     animate-slideDown
                     left-2 right-2 sm:left-1/2 sm:-translate-x-1/2
                     p-4 sm:p-3 bg-red-100/50 backdrop-blur-sm text-red-800 border border-red-300/40
                     rounded-xl flex flex-col sm:flex-row items-start sm:items-center
                     justify-between gap-2 sm:gap-4 shadow-lg
                     max-w-[95%] sm:max-w-md md:max-w-lg
                     break-words overflow-auto"
        >
          <div className="flex flex-col gap-1 sm:gap-0">
            {/* Service unavailable message */}
            {message.includes("Service unavailable") && (
              <>
                <span className="text-base sm:text-lg font-semibold">⚠️ Service unavailable.</span>
                <span className="text-base sm:text-lg">We’re open only Monday to Thursday.</span>
              </>
            )}

            {/* Ordering time over message with clickable phone */}
            {message.includes("Ordering time is over") && (
              <>
                <span className="text-base sm:text-lg font-semibold">⏰ Ordering time is over (after 11:30 PM).</span>
                <span className="text-base sm:text-lg">You can call us directly if we’re still at the Ertib place:</span>
                <a
                  href="tel:+251954724664"
                  className="text-base sm:text-lg font-medium text-amber-700 hover:underline flex items-center gap-1"
                >
                  <span>📞</span> +251954724664
                </a>
              </>
            )}
          </div>

          <button
            onClick={() => setMessage("")}
            className="text-red-700 hover:text-red-900 transition self-end sm:self-auto mt-2 sm:mt-0"
          >
            <AiOutlineClose size={22} />
          </button>
        </div>
      )}

      {/* ✅ Success / Logout Message */}
      {message && serviceAvailable && (
        <div className="mt-4 p-3 bg-green-100 text-green-800 border border-green-300 rounded flex items-center justify-between max-w-lg w-full">
          <span>{message}</span>
          <button onClick={() => setMessage("")}>
            <AiOutlineClose />
          </button>
        </div>
      )}

      {/* ✅ Hero Section */}
      <div className="text-center max-w-2xl mt-6">
        <h1 className="text-3xl md:text-4xl font-bold mb-4 text-amber-700 text-center">
          {/* 👋 Welcome {user ? <span className="text-red-500">{user.name}</span> : "to"} Fast Delivery Service! */}
              👋 Welcome To Fast Delivery Service!
        </h1>

        <p className="text-gray-700 mb-3 text-lg">
          We deliver <span className="font-semibold text-amber-700">Leyla’s Ertib </span> 
          straight from <span className="font-semibold">Tuludimtu</span> to your dorm — exclusively for 
          <span className="font-semibold"> AASTU students</span>! 🚴‍♂️
        </p>

        {!user ? (
          <div className="mb-6 space-y-3">
            <p className="text-gray-800 text-center">
              If you want to <span className="font-semibold">track</span> or <span className="font-semibold">edit</span> your order, please{" "}
              <Link to="/login" className="text-amber-700 font-semibold hover:underline">login</Link>.
            </p>
            <button
              disabled={!serviceAvailable}
              onClick={() => navigate("/order")}
              className={`inline-block px-6 py-3 rounded-full transition shadow-lg ${
                serviceAvailable
                  ? "bg-amber-700 text-white hover:bg-amber-800"
                  : "bg-gray-400 text-gray-100 cursor-not-allowed"
              }`}
            >
              🥙 Order Directly
            </button>
          </div>
        ) : (
          <button
            disabled={!serviceAvailable}
            onClick={() => navigate("/order")}
            className={`inline-block px-6 py-3 rounded-full transition shadow-lg ${
              serviceAvailable
                ? "bg-amber-700 text-white hover:bg-amber-800"
                : "bg-gray-400 text-gray-100 cursor-not-allowed"
            }`}
          >
            🥙 Place Your Order
          </button>
        )}
      </div>

      {/* ✅ Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-4xl">
        <div className="bg-white p-6 rounded-2xl shadow text-center">
          <h3 className="font-semibold text-lg mb-1">Fast Campus Delivery</h3>
          <p className="text-gray-600 text-sm">
            We deliver your favorite Ertib directly to your dorm quickly and fresh!
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow text-center">
          <h3 className="font-semibold text-lg mb-1">Exclusive for AASTU</h3>
          <p className="text-gray-600 text-sm">
            Only available for Addis Ababa Science & Technology University students.
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow text-center">
          <h3 className="font-semibold text-lg mb-1">Easy Contact</h3>
          <p className="text-gray-600 text-sm">
            Questions? Call{" "}
            <a href="tel:+251954724664" className="text-amber-700 font-semibold hover:underline">
              +251954724664
            </a>
          </p>
        </div>
      </div>

      {/* ✅ Footer */}
      <footer className="mt-12 text-gray-600 text-sm text-center">
        © {new Date().getFullYear()} Fast Delivery Service — Exclusively for AASTU Students.
      </footer>
    </div>
  );
}
