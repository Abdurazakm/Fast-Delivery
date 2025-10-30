import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Orders from "./pages/Orders";
import AdminDashboard from "./pages/admin/AdminDashboard";
import API from "./api"; // Axios instance

/* ------------------ Modal ------------------ */
function Modal({ title, message, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal content */}
      <div className="relative bg-white rounded-xl shadow-lg p-6 max-w-md w-[90%] z-10">
        <h3 className="text-xl font-semibold text-center mb-4">{title}</h3>
        <div className="text-gray-700 text-center space-y-1 mb-6">
          {message}
        </div>
        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="bg-amber-600 hover:bg-amber-700 transition text-white px-4 py-2 rounded-md"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

/* --------- Service availability check ---------
   Open: Monday–Thursday until 5:30 PM (device local time)
------------------------------------------------*/
const checkAvailability = (now = new Date()) => {
  const day = now.getDay(); // Sun = 0 ... Sat = 6
  const hour = now.getHours();
  const minute = now.getMinutes();

  const workingDay = day >= 1 && day <= 4; // Mon–Thu
  const beforeClosing = hour < 17 || (hour === 17 && minute <= 30); // before 5:30 PM

  return workingDay && beforeClosing; // true if service is available
};


/* ---------------- Protected Route ---------------- */
function ProtectedRoute({ children, user, loadingUser }) {
  const navigate = useNavigate();

  if (loadingUser) return null;

  if (user?.role === "admin") return children;

  const serviceAvailable = checkAvailability();

  if (!serviceAvailable) {
    const now = new Date();
    const day = now.getDay();
    const workingDay = day >= 1 && day <= 4; // Mon–Thu

    return (
      <Modal
        title={workingDay ? "⏰ Ordering Time is Over" : "⚠️ Service Unavailable"}
        message={
          workingDay ? (
            <>
              <span className="block text-base sm:text-lg font-semibold">
                ⏰ Ordering time is over (after 5:30 PM).
              </span>
              <span className="block text-base sm:text-lg">
                You can call us directly if we’re still at the Ertib place.
              </span>
            </>
          ) : (
            <>
              <span className="block text-base sm:text-lg font-semibold">
                ⚠️ Service unavailable.
              </span>
              <span className="block text-base sm:text-lg">
                We’re open only Monday to Thursday.
              </span>
            </>
          )
        }
        onClose={() => navigate("/")}
      />
    );
  }

  return children;
}


/* ---------------- Main App ---------------- */
function App() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [serviceAvailable, setServiceAvailable] = useState(true);

  // Fetch current user if token exists
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoadingUser(false);
      return;
    }

    const fetchUser = async () => {
      try {
        const res = await API.get("/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(res.data);
      } catch (err) {
        console.error("Error fetching current user:", err);
        localStorage.removeItem("token");
        setUser(null);
      } finally {
        setLoadingUser(false);
      }
    };

    fetchUser();
  }, []);

  // Live service status check every 30s
  useEffect(() => {
    const update = () => setServiceAvailable(checkAvailability());
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={<Home user={user} serviceAvailable={serviceAvailable} />}
        />

        <Route
          path="/order"
          element={
            <ProtectedRoute
              user={user}
              loadingUser={loadingUser}
              serviceAvailable={serviceAvailable}
            >
              <Orders user={user} />
            </ProtectedRoute>
          }
        />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin" element={<AdminDashboard user={user} />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
