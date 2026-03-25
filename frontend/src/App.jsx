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
import Toast from "./pages/Toast";
import { getSocket } from "./socket";
import { initPushNotifications } from "./pushNotifications";
/* ---------------- Main App ---------------- */
function App() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [availability, setAvailability] = useState(null);
  const [serverOffsetMs, setServerOffsetMs] = useState(0); // difference between server and client time
  const [notificationToast, setNotificationToast] = useState(null);

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

  const getEATNowParts = (referenceDate = new Date()) => {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Africa/Addis_Ababa",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      hourCycle: "h23",
    });

    const parts = formatter.formatToParts(referenceDate);
    const dayStr = parts.find((p) => p.type === "weekday")?.value;

    return {
      day: dayMap[dayStr],
      hour: Number(parts.find((p) => p.type === "hour")?.value ?? 0),
      minute: Number(parts.find((p) => p.type === "minute")?.value ?? 0),
    };
  };

  const checkAvailability = (availability) => {
    if (!availability) return true; // default: available

    const now = new Date(Date.now() + serverOffsetMs);
    const { day, hour, minute } = getEATNowParts(now);

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
      const now = new Date(Date.now() + serverOffsetMs);
      const { day } = getEATNowParts(now);
      const workingDay = availability?.weeklyDays?.some(
        (d) => dayMap[d] === day,
      );

      if (availability?.isTemporarilyClosed) {
        return (
          <Modal
            title="⚠️ Service Temporarily Closed"
            message={
              availability.tempCloseReason || "We are temporarily closed."
            }
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
  /* ---------------- Staff Protected Route ---------------- */
  function AdminOrEmployRoute({ children, user, loadingUser }) {
    const navigate = useNavigate();
    const role = (user?.role || "").toLowerCase();
    const isStaff = role === "employ" || role === "employee";

    if (loadingUser) return null;
    if (!user || (role !== "admin" && !isStaff)) {
      return (
        <Modal
          title="⛔ Access Denied"
          message="Only admin or employ accounts can access this page."
          onClose={() => navigate("/")}
        />
      );
    }

    return children;
  }

  function AdminRoute({ children, user, loadingUser }) {
    const navigate = useNavigate();
    const role = (user?.role || "").toLowerCase();

    if (loadingUser) return null;
    if (!user || role !== "admin") {
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

  useEffect(() => {
    const socket = getSocket();

    const showNativeNotification = async (payload) => {
      if (!("Notification" in window)) return false;
      if (Notification.permission !== "granted") return false;

      const title = payload.title || "Notification";
      const body = payload.message || "You have a new update.";
      const url =
        payload.url ||
        (payload.trackingCode ? `/track/${payload.trackingCode}` : "/");

      try {
        if ("serviceWorker" in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            await registration.showNotification(title, {
              body,
              icon: "/favicon.ico",
              badge: "/favicon.ico",
              tag: payload.type || "notification",
              renotify: true,
              requireInteraction: true,
              data: { url },
            });
            return true;
          }
        }

        new Notification(title, {
          body,
          icon: "/favicon.ico",
          tag: payload.type || "notification",
          renotify: true,
          requireInteraction: true,
          data: { url },
        });
        return true;
      } catch (err) {
        return false;
      }
    };

    const handleNotification = async (payload) => {
      if (!payload?.message) return;

      const shownAsPopup = await showNativeNotification(payload);
      if (shownAsPopup) return;

      const title = payload.title ? `${payload.title}: ` : "";
      setNotificationToast({
        type: payload.type === "status" ? "success" : "info",
        message: `${title}${payload.message}`,
      });
    };

    socket.on("notification:broadcast", handleNotification);

    return () => {
      socket.off("notification:broadcast", handleNotification);
    };
  }, []);

  useEffect(() => {
    const socket = getSocket();

    if (user?.role === "admin") {
      socket.emit("join-admin");
      return () => {
        socket.emit("leave-admin");
      };
    }

    socket.emit("leave-admin");
    return undefined;
  }, [user?.role]);

  useEffect(() => {
    initPushNotifications().catch(() => {});
  }, []);

  return (
    <Router>
      {notificationToast && (
        <Toast
          message={notificationToast.message}
          type={notificationToast.type}
          onClose={() => setNotificationToast(null)}
          duration={5000}
        />
      )}
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
            <AdminOrEmployRoute user={user} loadingUser={loadingUser}>
              <AdminDashboard user={user} />
            </AdminOrEmployRoute>
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
