import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  Phone,
  MapPin,
  Shield,
  LogOut,
  Utensils,
  ShoppingBag,
  Bike,
  ExternalLink,
  CheckCircle2,
  Calendar,
  Clock,
  ChevronRight,
  RotateCcw,
  KeyRound,
  Bell,
  HelpCircle,
  Copy,
  Check,
  AlertCircle,
  Edit3,
  Award,
  Wallet,
  Building,
} from "lucide-react";
import API from "../api";
import Toast from "./Toast";
import PageLoader from "../components/PageLoader";
import TrackingInfoCard from "./TrackingInfoCard";
import NotificationBell from "../components/NotificationBell";
import Navbar from "../components/Navbar";
import {
  getPushNotificationStatus,
  enablePushNotificationsNow,
} from "../pushNotifications";


const FOOD_EMOJIS = {
  ertib: "🍲",
  fetira: "🥞",
  sambusa: "🥟",
  donut: "🍩",
  boiled_egg: "🥚",
};

export default function Profile({ user: propUser, setUser: propSetUser }) {
  const [user, setUser] = useState(propUser || null);
  const [loading, setLoading] = useState(!propUser);
  const [activeTab, setActiveTab] = useState("history"); // "history" | "address" | "security" | "stats"
  const [orderFilter, setOrderFilter] = useState("all"); // "all" | "active" | "delivered"
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [stats, setStats] = useState(null);
  const [toast, setToast] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  const [pushStatus, setPushStatus] = useState("default");

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [blockInput, setBlockInput] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // 1. Initial Load: User data, Stats, Push status
  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    const fetchUserData = async () => {
      try {
        const resUser = await API.get("/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(resUser.data);
        setNameInput(resUser.data.name || "");
        setBlockInput(resUser.data.block || "");
        if (typeof propSetUser === "function") {
          propSetUser(resUser.data);
        }
      } catch (err) {
        console.error("Auth me error:", err);
        localStorage.removeItem("token");
        if (typeof propSetUser === "function") propSetUser(null);
        navigate("/login", { replace: true });
        return;
      } finally {
        setLoading(false);
      }

      // Fetch user stats
      try {
        const resStats = await API.get("/auth/stats", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStats(resStats.data);
      } catch {
        // Fallback stats
      }

      // Fetch order history
      try {
        const resHistory = await API.get("/orders/my-history", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrders(resHistory.data || []);
      } catch {
        // Try fallback to /orders/latest
        try {
          const resLatest = await API.get("/orders/latest", {
            headers: { Authorization: `Bearer ${token}` },
          });
          setOrders(Array.isArray(resLatest.data) ? resLatest.data : []);
        } catch {
          setOrders([]);
        }
      } finally {
        setLoadingOrders(false);
      }
    };

    fetchUserData();

    // Check push status
    getPushNotificationStatus().then((status) => {
      setPushStatus(status.permission);
    });
  }, [token, navigate, propSetUser]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("name");
    setUser(null);
    if (typeof propSetUser === "function") {
      propSetUser(null);
    }
    navigate("/", { replace: true });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      setToast({ message: "Name cannot be empty.", type: "error" });
      return;
    }

    setSavingProfile(true);
    try {
      const res = await API.put(
        "/auth/profile",
        { name: nameInput.trim(), block: blockInput.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setUser(res.data.user);
      if (typeof propSetUser === "function") propSetUser(res.data.user);
      setIsEditingProfile(false);
      setToast({ message: "Profile details updated successfully!", type: "success" });
    } catch (err) {
      setToast({
        message: err.response?.data?.message || "Failed to update profile.",
        type: "error",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");

    if (!currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      setPasswordError("New password must be at least 4 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      await API.put(
        "/auth/change-password",
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError("");
      setToast({ message: "Password updated successfully!", type: "success" });
    } catch (err) {
      setPasswordError(err.response?.data?.message || "Failed to update password.");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleEnablePush = async () => {
    try {
      const res = await enablePushNotificationsNow();
      if (res.success) {
        setPushStatus("granted");
        setToast({ message: "Push notifications enabled!", type: "success" });
      } else {
        setPushStatus(res.permission || "denied");
        setToast({
          message: res.message || "Notification permission denied.",
          type: "error",
        });
      }
    } catch {
      setToast({ message: "Could not enable notifications.", type: "error" });
    }
  };

  const handleCopyTracking = (code) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleReorder = (order) => {
    let foodType = "ertib";
    try {
      const items = Array.isArray(order.items)
        ? order.items
        : typeof order.items === "string"
          ? JSON.parse(order.items)
          : [];
      if (items.length > 0 && items[0].foodType) {
        foodType = items[0].foodType;
      }
    } catch {
      foodType = "ertib";
    }
    navigate(`/order?food=${foodType}`);
  };

  const formatOrderDate = (isoString) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat("en-US", {
        timeZone: "Africa/Addis_Ababa",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    } catch {
      return isoString;
    }
  };

  const formatMemberDate = (isoString) => {
    if (!isoString) return "2026";
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        year: "numeric",
      }).format(d);
    } catch {
      return "2026";
    }
  };

  const roleLower = (user?.role || "").toLowerCase();
  const isAdmin = roleLower === "admin";
  const isStaff =
    roleLower === "employ" ||
    roleLower === "employee" ||
    roleLower === "supleyer";

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    if (orderFilter === "active") {
      return !["delivered", "cancelled"].includes(o.status);
    }
    if (orderFilter === "delivered") {
      return o.status === "delivered";
    }
    return true;
  });

  if (loading) {
    return (
      <PageLoader
        message="Loading your profile..."
        subtext="Syncing your dorm details & order history"
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/70 text-gray-900 flex flex-col justify-between selection:bg-amber-100 selection:text-amber-900">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Responsive Navbar */}
      <Navbar user={user} />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-4 sm:pt-8 pb-28 sm:pb-16">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-start space-y-6 lg:space-y-0">
          {/* Left Column (Desktop 4 cols, sticky): User Identity & Desktop Navigation Sidebar */}
          <aside className="lg:col-span-4 space-y-5 lg:sticky lg:top-24">
            {/* User Identity Hero Card */}
            <section className="bg-white rounded-3xl border border-gray-200/90 shadow-xs p-5 sm:p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5 sm:gap-4">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 text-white flex items-center justify-center font-black text-2xl sm:text-3xl shadow-md shadow-amber-200/80 shrink-0">
                    {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-lg sm:text-2xl font-black text-gray-950 truncate">
                        {user?.name || "Student"}
                      </h1>
                      <span
                        className={`text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full border ${
                          isAdmin
                            ? "bg-purple-50 text-purple-800 border-purple-200"
                            : isStaff
                              ? "bg-blue-50 text-blue-800 border-blue-200"
                              : "bg-emerald-50 text-emerald-800 border-emerald-200"
                        }`}
                      >
                        {isAdmin ? "Admin" : isStaff ? "Staff" : "Verified Student"}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 font-medium flex-wrap">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        <span className="font-mono">{user?.phone || "No phone"}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-gray-400" />
                        <span>{user?.block || "No Block Set"}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>Member since {formatMemberDate(user?.createdAt)}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setIsEditingProfile(!isEditingProfile)}
                  className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
                  title="Edit Profile"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {isEditingProfile ? "Close" : "Edit Profile"}
                  </span>
                </button>
              </div>

              {/* Quick Edit Profile Inline Form */}
              {isEditingProfile && (
                <form
                  onSubmit={handleUpdateProfile}
                  className="mt-4 pt-4 border-t border-gray-100 bg-amber-50/50 p-4 rounded-2xl border border-amber-200/60 space-y-3"
                >
                  <h3 className="text-xs font-black uppercase text-amber-900 tracking-wider">
                    Edit Personal Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="font-bold text-gray-700 block mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
                        placeholder="Enter full name"
                        required
                      />
                    </div>
                    <div>
                      <label className="font-bold text-gray-700 block mb-1">
                        Default Dorm Block & Room
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          list="profileEditBlockOptions"
                          type="text"
                          value={blockInput}
                          onChange={(e) => setBlockInput(e.target.value)}
                          placeholder="e.g. Block 14, Room 204"
                          className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 font-bold placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                        <datalist id="profileEditBlockOptions">
                          {Array.from({ length: 28 }, (_, i) => (
                            <option key={i + 1} value={`Block ${i + 1}`} />
                          ))}
                        </datalist>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="px-3 py-1.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-60"
                    >
                      {savingProfile ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              )}

              {/* Customer Delivery Stats Strip */}
              <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-gray-100 text-center">
                <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  <span className="text-[10px] uppercase font-bold text-gray-500 block">
                    Total Orders
                  </span>
                  <span className="text-base sm:text-xl font-black text-gray-950 mt-0.5 block">
                    {stats?.totalOrders ?? orders.length}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/60">
                  <span className="text-[10px] uppercase font-bold text-amber-800 block">
                    Total Spent
                  </span>
                  <span className="text-base sm:text-xl font-black text-amber-950 mt-0.5 block">
                    {stats?.totalSpent ?? 0}{" "}
                    <span className="text-[11px] font-bold text-amber-800">Birr</span>
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/60">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                    Favorite
                  </span>
                  <span className="text-base sm:text-xl font-black text-emerald-950 mt-0.5 block capitalize truncate">
                    {FOOD_EMOJIS[stats?.favoriteFood || "ertib"] || "🍲"}{" "}
                    {stats?.favoriteFood || "Ertib"}
                  </span>
                </div>
              </div>
            </section>

            {/* Desktop Navigation Sidebar (visible on lg:) */}
            <nav className="hidden lg:flex flex-col bg-white rounded-3xl border border-gray-200/90 shadow-xs p-2 space-y-1">
              <button
                onClick={() => setActiveTab("history")}
                className={`w-full px-4 py-3 rounded-2xl text-xs font-extrabold flex items-center justify-between transition cursor-pointer ${
                  activeTab === "history"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4" />
                  <span>Order History</span>
                </div>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    activeTab === "history"
                      ? "bg-white/20 text-white"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {orders.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("address")}
                className={`w-full px-4 py-3 rounded-2xl text-xs font-extrabold flex items-center gap-2.5 transition cursor-pointer ${
                  activeTab === "address"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span>Dorm & Delivery Block</span>
              </button>

              <button
                onClick={() => setActiveTab("security")}
                className={`w-full px-4 py-3 rounded-2xl text-xs font-extrabold flex items-center gap-2.5 transition cursor-pointer ${
                  activeTab === "security"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <KeyRound className="w-4 h-4" />
                <span>Security & Password</span>
              </button>

              <button
                onClick={() => setActiveTab("support")}
                className={`w-full px-4 py-3 rounded-2xl text-xs font-extrabold flex items-center gap-2.5 transition cursor-pointer ${
                  activeTab === "support"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                <span>Help & Notifications</span>
              </button>

              <div className="pt-2 border-t border-gray-100 mt-1">
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2.5 rounded-2xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition flex items-center gap-2.5 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out of Account</span>
                </button>
              </div>
            </nav>
          </aside>

          {/* Right Column (Desktop 8 cols): Tab Content Panel */}
          <div className="lg:col-span-8 space-y-6">
            {/* Mobile Section Navigation Tabs (hidden on lg:) */}
            <div className="lg:hidden flex items-center gap-2 overflow-x-auto no-scrollbar py-1 border-b border-gray-200">
              <button
                onClick={() => setActiveTab("history")}
                className={`pb-2 px-3 text-xs sm:text-sm font-extrabold transition-all border-b-2 shrink-0 cursor-pointer ${
                  activeTab === "history"
                    ? "border-amber-500 text-amber-700"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
              >
                Order History ({orders.length})
              </button>

              <button
                onClick={() => setActiveTab("address")}
                className={`pb-2 px-3 text-xs sm:text-sm font-extrabold transition-all border-b-2 shrink-0 cursor-pointer ${
                  activeTab === "address"
                    ? "border-amber-500 text-amber-700"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
              >
                Dorm & Delivery Block
              </button>

              <button
                onClick={() => setActiveTab("security")}
                className={`pb-2 px-3 text-xs sm:text-sm font-extrabold transition-all border-b-2 shrink-0 cursor-pointer ${
                  activeTab === "security"
                    ? "border-amber-500 text-amber-700"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
              >
                Security & Password
              </button>

              <button
                onClick={() => setActiveTab("support")}
                className={`pb-2 px-3 text-xs sm:text-sm font-extrabold transition-all border-b-2 shrink-0 cursor-pointer ${
                  activeTab === "support"
                    ? "border-amber-500 text-amber-700"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
              >
                Help & Notifications
              </button>
            </div>

        {/* TAB 1: ORDER HISTORY */}
        {activeTab === "history" && (
          <section className="space-y-4">
            {/* Filter pills */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setOrderFilter("all")}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                    orderFilter === "all"
                      ? "bg-amber-500 text-white"
                      : "bg-white text-gray-700 border border-gray-200"
                  }`}
                >
                  All ({orders.length})
                </button>
                <button
                  onClick={() => setOrderFilter("active")}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                    orderFilter === "active"
                      ? "bg-amber-500 text-white"
                      : "bg-white text-gray-700 border border-gray-200"
                  }`}
                >
                  Active ({orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length})
                </button>
                <button
                  onClick={() => setOrderFilter("delivered")}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                    orderFilter === "delivered"
                      ? "bg-amber-500 text-white"
                      : "bg-white text-gray-700 border border-gray-200"
                  }`}
                >
                  Delivered ({orders.filter((o) => o.status === "delivered").length})
                </button>
              </div>

              <Link
                to="/order"
                className="text-xs font-extrabold text-amber-800 hover:underline flex items-center gap-1"
              >
                <span>+ New Order</span>
              </Link>
            </div>

            {loadingOrders ? (
              <div className="bg-white rounded-3xl p-8 text-center text-gray-500 text-xs font-bold">
                Loading order history...
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-white rounded-3xl border border-gray-200/80 p-8 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto text-3xl">
                  🍲
                </div>
                <div>
                  <h3 className="font-black text-base text-gray-950">
                    No orders found
                  </h3>
                  <p className="text-xs text-gray-500 font-medium mt-1">
                    {orderFilter === "all"
                      ? "You haven't placed any dorm delivery orders yet."
                      : `No ${orderFilter} orders currently.`}
                  </p>
                </div>
                <Link
                  to="/menu"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-xs transition"
                >
                  <Utensils className="w-4 h-4" />
                  <span>Explore Campus Menu</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((ord) => {
                  let items = [];
                  try {
                    items = Array.isArray(ord.items)
                      ? ord.items
                      : typeof ord.items === "string"
                        ? JSON.parse(ord.items || "[]")
                        : [];
                  } catch {
                    items = [];
                  }

                  const isDelivered = ord.status === "delivered";
                  const isCancelled = ord.status === "cancelled";
                  const isActive = !isDelivered && !isCancelled;

                  return (
                    <div
                      key={ord.id || ord.trackingCode}
                      className="bg-white rounded-3xl border border-gray-200/90 shadow-xs p-4 sm:p-5 space-y-3 transition hover:border-amber-300"
                    >
                      {/* Top Row: Tracking Code & Status Pill */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-xs sm:text-sm text-gray-950">
                            {ord.trackingCode}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyTracking(ord.trackingCode)}
                            className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
                            title="Copy tracking code"
                          >
                            {copiedCode === ord.trackingCode ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full border ${
                              isDelivered
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                : isCancelled
                                  ? "bg-rose-50 text-rose-800 border-rose-300"
                                  : "bg-amber-50 text-amber-800 border-amber-300 animate-pulse"
                            }`}
                          >
                            {ord.status}
                          </span>
                        </div>
                      </div>

                      {/* Items Summary */}
                      <div className="space-y-1 text-xs">
                        {items.map((it, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-gray-700"
                          >
                            <span className="font-semibold flex items-center gap-1.5">
                              <span>{FOOD_EMOJIS[it.foodType || "ertib"] || "🍲"}</span>
                              <span>
                                {it.quantity || 1}x {it.foodType || "Ertib"}
                                {it.ertibType === "special" ? " (Special)" : ""}
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Info Bar: Location & Date */}
                      <div className="flex items-center justify-between text-[11px] text-gray-500 font-medium pt-2 border-t border-gray-100">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          <span className="truncate max-w-[150px] sm:max-w-xs">
                            {ord.location || "AASTU Dorm"}
                          </span>
                        </span>
                        <span>{formatOrderDate(ord.createdAt)}</span>
                      </div>

                      {/* Bottom Row: Total & Action Buttons */}
                      <div className="pt-2 flex items-center justify-between gap-3 border-t border-gray-100">
                        <div>
                          <span className="text-[10px] text-gray-400 font-bold block uppercase">
                            Total Paid
                          </span>
                          <span className="font-black text-sm sm:text-base text-gray-950">
                            {ord.total}{" "}
                            <span className="text-xs text-amber-800 font-bold">
                              Birr
                            </span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleReorder(ord)}
                            className="px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 active:bg-gray-100 text-xs font-bold text-gray-700 transition flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                            <span>Reorder</span>
                          </button>

                          <Link
                            to={`/track/${encodeURIComponent(ord.trackingCode)}`}
                            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold shadow-xs transition flex items-center gap-1"
                          >
                            <Bike className="w-3.5 h-3.5" />
                            <span>Track</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* TAB 2: DORM & DELIVERY ADDRESS SETTINGS */}
        {activeTab === "address" && (
          <section className="bg-white rounded-3xl border border-gray-200/90 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-gray-950">
                  Default Campus Dorm Address
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  Automatically populates during checkout for faster food deliveries.
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 block">
                  AASTU Dorm Block & Room
                </label>
                <div className="relative">
                  <MapPin className="w-5 h-5 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    list="profileTabBlockOptions"
                    type="text"
                    value={blockInput}
                    onChange={(e) => setBlockInput(e.target.value)}
                    placeholder="e.g. Block 14, Room 204"
                    className="w-full pl-11 pr-4 py-3 min-h-[48px] rounded-xl border-2 border-gray-200 text-base sm:text-sm font-semibold text-gray-950 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
                  />
                  <datalist id="profileTabBlockOptions">
                    {Array.from({ length: 28 }, (_, i) => (
                      <option key={i + 1} value={`Block ${i + 1}`} />
                    ))}
                  </datalist>
                </div>
                <p className="text-[11px] text-gray-400 font-medium">
                  Delivery riders bring your food directly to this dorm block gate or entrance.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/70 flex items-start gap-2.5 text-xs text-amber-900 font-medium">
                <MapPin className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  Tip: When placing an order, you can also include specific instructions like
                  "Call when at gate" or your room number in the order note field.
                </span>
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs sm:text-sm shadow-xs transition cursor-pointer disabled:opacity-60"
              >
                {savingProfile ? "Saving Address..." : "Save Delivery Address"}
              </button>
            </form>
          </section>
        )}

        {/* TAB 3: SECURITY & PASSWORD */}
        {activeTab === "security" && (
          <section className="bg-white rounded-3xl border border-gray-200/90 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-gray-950">
                  Account Security
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  Update your account password to protect your delivery orders.
                </p>
              </div>
            </div>

            {passwordError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3.5 pt-1">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="Enter current password"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="Min 4 characters"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="Repeat new password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingPassword}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs sm:text-sm shadow-xs transition cursor-pointer disabled:opacity-60"
              >
                {savingPassword ? "Updating Password..." : "Update Password"}
              </button>
            </form>

            <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="font-extrabold text-xs sm:text-sm text-gray-950 block">
                  Sign Out of Account
                </span>
                <span className="text-[11px] text-gray-500 font-medium">
                  Safely disconnect your account session from this browser.
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          </section>
        )}

        {/* TAB 4: HELP & NOTIFICATIONS */}
        {activeTab === "support" && (
          <section className="space-y-4">
            {/* Push Notifications Card */}
            <div className="bg-white rounded-3xl border border-gray-200/90 shadow-xs p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-gray-950">
                    Live Order Notifications
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    Get instant phone alerts when your food is being prepared and arriving.
                  </p>
                </div>
              </div>

              {pushStatus === "granted" ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Enabled</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleEnablePush}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-xs transition shrink-0 cursor-pointer"
                >
                  Enable Alerts
                </button>
              )}
            </div>

            {/* Direct Customer Support Card */}
            <div className="bg-white rounded-3xl border border-gray-200/90 shadow-xs p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-gray-950">
                    Need Help With An Order?
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    Reach out to our campus kitchen and delivery team directly.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                <a
                  href="tel:+251954724664"
                  className="p-3 rounded-2xl bg-gray-50 hover:bg-gray-100 border border-gray-200/80 flex items-center justify-between transition group"
                >
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-emerald-600" />
                    <div>
                      <span className="font-bold text-gray-900 block">Phone Call</span>
                      <span className="text-[11px] text-gray-500 font-mono">
                        +251 95 472 4664
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition" />
                </a>

                <a
                  href="https://t.me/fetandelivery"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-2xl bg-gray-50 hover:bg-gray-100 border border-gray-200/80 flex items-center justify-between transition group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">✈️</span>
                    <div>
                      <span className="font-bold text-gray-900 block">Telegram Support</span>
                      <span className="text-[11px] text-gray-500">
                        @fetandelivery
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition" />
                </a>
              </div>
            </div>
          </section>
        )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200/80 bg-white pt-6 pb-24 sm:pb-6 text-center text-xs text-gray-500">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-center">
          <p>© {new Date().getFullYear()} Fetan Delivery Service — AASTU Campus.</p>
        </div>
      </footer>
    </div>
  );
}
