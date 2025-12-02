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
import TrackOrder from "./pages/TrackOrder";
import API from "./api"; // Axios instance
import AdminAvailability from "./pages/admin/AdminAvailability";

/* ------------------ Modal ------------------ */
function Modal({ title, message, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
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

/* ---------------- Dynamic Availability ---------------- */
const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const checkAvailability = (availability, now = new Date()) => {
  if (!availability) return true; // default: available

  const day = now.getDay();
  const hour = now.getHours();
  const minute = now.getMinutes();

  const workingDay = availability.weeklyDays?.some((d) => dayMap[d] === day);

  const [cutoffHour, cutoffMinute] = availability.cutoffTime
    .split(":")
    .map(Number);
  const beforeClosing =
    hour < cutoffHour || (hour === cutoffHour && minute <= cutoffMinute);

  if (availability.isTemporarilyClosed) return false;

  return workingDay && beforeClosing;
};

/* ---------------- Protected Route ---------------- */
function ProtectedRoute({ children, user, loadingUser, availability }) {
  const navigate = useNavigate();

  if (loadingUser) return null;
  if (user?.role === "admin") return children;

  const serviceAvailable = checkAvailability(availability);

  if (!serviceAvailable) {
    const now = new Date();
    const day = now.getDay();
    const workingDay = availability?.weeklyDays?.some((d) => dayMap[d] === day);

    if (availability?.isTemporarilyClosed) {
      return (
        <Modal
          title="⚠️ Service Temporarily Closed"
          message={availability.tempCloseReason || "We are temporarily closed."}
          onClose={() => navigate("/")}
        />
      );
    }

    return (
      <Modal
        title={
          workingDay ? "⏰ Ordering Time is Over" : "⚠️ Service Unavailable"
        }
        message={
          workingDay ? (
            <>
              <span>
                You can call us directly if we’re still at the Ertib place.
              </span>
              <a href="tel:+251954724664">📞 +251954724664</a>
            </>
          ) : (
            <span>We’re open only on selected days.</span>
          )
        }
        onClose={() => navigate("/")}
      />
    );
  }

  return children;
}

/* ---------------- Admin Protected Route ---------------- */
function AdminRoute({ children, user, loadingUser }) {
  const navigate = useNavigate();

  if (loadingUser) return null;
  if (!user || user.role !== "admin") {
    return (
      <Modal
        title="⛔ Access Denied"
        message="Only administrators can access this page."
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
  const [availability, setAvailability] = useState(null);
  const [serverOffsetMs, setServerOffsetMs] = useState(0); // difference between server and client time

  // Fetch current user
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
        console.error(err);
        localStorage.removeItem("token");
        setUser(null);
      } finally {
        setLoadingUser(false);
      }
    };

    fetchUser();
  }, []);

  // Fetch availability and server time
  useEffect(() => {
    const fetchAvailabilityAndServerTime = async () => {
      try {
        const [availabilityRes, serverTimeRes] = await Promise.all([
          API.get("/availability"),
          API.get("/server-time"),
        ]);

        setAvailability(availabilityRes.data);

        const serverTime = new Date(serverTimeRes.data.serverTime);
        const localTime = new Date();
        setServerOffsetMs(serverTime - localTime);
      } catch (err) {
        console.error("Error fetching availability or server time:", err);
      }
    };

    fetchAvailabilityAndServerTime();
  }, []);

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <Home
              user={user}
              availability={availability}
              serverOffsetMs={serverOffsetMs}
            />
          }
        />
        <Route
          path="/order"
          element={
            <ProtectedRoute
              user={user}
              loadingUser={loadingUser}
              availability={availability}
            >
              <Orders user={user} serverOffsetMs={serverOffsetMs} />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/admin"
          element={
            <AdminRoute user={user} loadingUser={loadingUser}>
              <AdminDashboard user={user} />
            </AdminRoute>
          }
        />
        <Route
          path="/availability"
          element={
            <AdminRoute user={user} loadingUser={loadingUser}>
              <AdminAvailability user={user} />
            </AdminRoute>
          }
        />
        <Route path="/track/:code" element={<TrackOrder />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
