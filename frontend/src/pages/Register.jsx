import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  User,
  Phone,
  Lock,
  Eye,
  EyeOff,
  MapPin,
  ShieldCheck,
  UserPlus,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Utensils,
  CheckCircle2,
  Zap,
  Sparkles,
} from "lucide-react";
import API from "../api";
import MobileBottomNav from "../components/MobileBottomNav";
import Navbar from "../components/Navbar";
import Logo from "../components/Logo";

export default function Register({ onLoginSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    block: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const passwordsMatch =
    Boolean(formData.password) &&
    Boolean(formData.confirmPassword) &&
    formData.password === formData.confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match. Please ensure both passwords match.");
      return;
    }

    if (formData.password.length < 4) {
      setError("Password must be at least 4 characters long.");
      return;
    }

    setLoading(true);

    try {
      // 1. Register with backend
      const regPayload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        block: formData.block.trim(),
        password: formData.password,
      };

      const res = await API.post("/auth/register", regPayload);

      // 2. Seamless auto-login right after registration
      try {
        const loginRes = await API.post("/auth/login", {
          phone: formData.phone.trim(),
          password: formData.password,
        });

        const { token, user } = loginRes.data;
        localStorage.setItem("token", token);
        localStorage.setItem("role", user.role);
        localStorage.setItem("name", user.name);

        const fcmToken = localStorage.getItem("fcm_token");
        if (fcmToken) {
          API.post(
            "/notifications/register-token",
            { token: fcmToken, phone: user.phone },
            { headers: { Authorization: `Bearer ${token}` } }
          ).catch(() => {});
        }

        if (typeof onLoginSuccess === "function") {
          onLoginSuccess(user);
        }

        setToast({
          message: "🎉 Account created successfully! Welcome to Ertib Delivery.",
          type: "success",
        });

        setTimeout(() => {
          navigate("/profile");
        }, 800);
        return;
      } catch {
        // Fallback if auto-login endpoint fails: redirect to login
        setToast({
          message: "🎉 Account registered! Please sign in with your credentials.",
          type: "success",
        });
        setTimeout(() => {
          navigate("/login");
        }, 1200);
      }
    } catch (err) {
      console.error("Registration error:", err);
      const errorMessage =
        err.response?.data?.message ||
        "Could not create account. Please check your information and try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/50 via-white to-gray-50/40 text-gray-900 flex flex-col justify-between">
      {/* Responsive Top Navbar */}
      <Navbar user={null} />

      {/* Main Form Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-6 sm:pt-12 pb-24 sm:pb-12 flex flex-col justify-center">
        <div className="lg:grid lg:grid-cols-12 lg:gap-12 items-center">
          {/* Left Column (Desktop Showcase, hidden on mobile) */}
          <div className="hidden lg:flex lg:col-span-6 flex-col space-y-6 pr-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100/90 border border-amber-200 text-amber-900 text-xs font-black w-fit">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Fast AASTU Student Registration 🚀</span>
            </div>

            <h1 className="text-4xl xl:text-5xl font-black text-gray-950 tracking-tight leading-[1.15]">
              Get Delicious Food Delivered to Your Dorm Room.
            </h1>

            <p className="text-sm text-gray-600 leading-relaxed font-medium">
              Join hundreds of AASTU students who order fresh campus meals weekly. Save your dorm block address once and enjoy one-tap checkout with live rider tracking.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-gray-200/80 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-gray-950">Direct Dorm Delivery</h4>
                  <p className="text-[11px] text-gray-500 font-medium">Riders deliver straight to your resident block gate or entrance.</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-gray-200/80 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-gray-950">Saved Campus Block & Room</h4>
                  <p className="text-[11px] text-gray-500 font-medium">Auto-populates on every order for fast, hassle-free checkout.</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-gray-200/80 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-gray-950">Live Real-Time Tracker</h4>
                  <p className="text-[11px] text-gray-500 font-medium">Watch your food prepare, bake, and arrive with real-time updates.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (Register Card) */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto">
            {/* Segmented Auth Navigation Control */}
            <div className="bg-gray-100/90 p-1 rounded-2xl flex items-center mb-6 border border-gray-200/80">
              <Link
                to="/login"
                className="flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-gray-500 hover:text-gray-900 transition-all text-center"
              >
                Sign In
              </Link>
              <button
                type="button"
                className="flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all bg-white text-gray-950 shadow-xs cursor-default"
              >
                Create Account
              </button>
            </div>

            {/* Card */}
            <section className="bg-white rounded-3xl border border-gray-200/90 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-3.5">
            <Logo variant="mark" size={42} className="shrink-0 mt-0.5" />
            <div>
              <h1 className="text-2xl font-black text-gray-950 tracking-tight">
                Create Account 🚀
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">
                Join Fetan Delivery for fast dorm delivery, saved campus addresses, and live order tracking.
              </p>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="font-semibold leading-relaxed">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-extrabold text-gray-800 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Abebe Kebede"
                  required
                  autoComplete="name"
                  className="w-full pl-11 pr-4 py-3 min-h-[48px] rounded-xl border-2 border-gray-200 text-base sm:text-sm font-semibold text-gray-950 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-extrabold text-gray-800 mb-1.5">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="09... or 07..."
                  required
                  autoComplete="tel"
                  inputMode="tel"
                  className="w-full pl-11 pr-4 py-3 min-h-[48px] rounded-xl border-2 border-gray-200 text-base sm:text-sm font-semibold text-gray-950 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
                />
              </div>
              <p className="text-[11px] text-gray-400 font-medium mt-1">
                Used to call or notify you when your food arrives.
              </p>
            </div>

            {/* AASTU Dorm Block & Room (Autocomplete matching Orders and Profile) */}
            <div>
              <label className="block text-xs font-extrabold text-gray-800 mb-1.5">
                AASTU Dorm Block & Room <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <MapPin className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  list="registerBlockOptions"
                  type="text"
                  name="block"
                  value={formData.block}
                  onChange={handleChange}
                  placeholder="e.g. Block 14, Room 204"
                  className="w-full pl-11 pr-4 py-3 min-h-[48px] rounded-xl border-2 border-gray-200 text-base sm:text-sm font-semibold text-gray-950 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
                />
                <datalist id="registerBlockOptions">
                  {Array.from({ length: 28 }, (_, i) => (
                    <option key={i + 1} value={`Block ${i + 1}`} />
                  ))}
                </datalist>
              </div>
              <p className="text-[11px] text-gray-400 font-medium mt-1">
                Saved as your primary delivery address for one-tap checkout.
              </p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-extrabold text-gray-800 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a secure password"
                  required
                  minLength={4}
                  autoComplete="new-password"
                  className="w-full pl-11 pr-11 py-3 min-h-[48px] rounded-xl border-2 border-gray-200 text-base sm:text-sm font-semibold text-gray-950 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-700 transition cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-extrabold text-gray-800">
                  Confirm Password
                </label>
                {formData.confirmPassword && (
                  <span
                    className={`text-[11px] font-bold flex items-center gap-1 ${
                      passwordsMatch ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    {passwordsMatch ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Passwords match</span>
                      </>
                    ) : (
                      <span>Passwords must match</span>
                    )}
                  </span>
                )}
              </div>
              <div className="relative">
                <ShieldCheck className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter your password"
                  required
                  minLength={4}
                  autoComplete="new-password"
                  className={`w-full pl-11 pr-11 py-3 min-h-[48px] rounded-xl border-2 text-base sm:text-sm font-semibold text-gray-950 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 transition ${
                    formData.confirmPassword && !passwordsMatch
                      ? "border-amber-300 focus:ring-amber-300 focus:border-amber-400"
                      : formData.confirmPassword && passwordsMatch
                        ? "border-emerald-300 focus:ring-emerald-300 focus:border-emerald-400"
                        : "border-gray-200 focus:ring-amber-400 focus:border-amber-400"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-700 transition cursor-pointer"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white font-extrabold text-base py-3.5 px-6 rounded-2xl shadow-md shadow-amber-200/80 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-3"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Switch to Login */}
          <div className="text-center pt-2 border-t border-gray-100">
            <p className="text-xs sm:text-sm text-gray-600 font-medium">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-amber-600 hover:text-amber-700 font-black hover:underline"
              >
                Sign In
              </Link>
            </p>
          </div>
        </section>

        {/* Feature Highlights Strip */}
        <div className="grid grid-cols-3 gap-2 mt-6 text-center">
          <div className="p-3 rounded-2xl bg-white/70 border border-gray-200/60 shadow-2xs">
            <Zap className="w-4 h-4 text-amber-600 mx-auto mb-1" />
            <span className="text-[11px] font-bold text-gray-900 block">
              Direct Delivery
            </span>
            <span className="text-[10px] text-gray-400 block font-medium">
              To Your Dorm
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-white/70 border border-gray-200/60 shadow-2xs">
            <MapPin className="w-4 h-4 text-orange-600 mx-auto mb-1" />
            <span className="text-[11px] font-bold text-gray-900 block">
              1-Tap Address
            </span>
            <span className="text-[10px] text-gray-400 block font-medium">
              Saved Forever
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-white/70 border border-gray-200/60 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
            <span className="text-[11px] font-bold text-gray-900 block">
              Live Tracker
            </span>
            <span className="text-[10px] text-gray-400 block font-medium">
              Real-Time Status
            </span>
          </div>
        </div>

            {/* Continue as Guest option */}
            <div className="text-center mt-5">
              <Link
                to="/order"
                className="text-xs text-gray-500 hover:text-gray-900 font-bold transition inline-flex items-center gap-1 hover:underline"
              >
                <span>Or continue to Order without signing in</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav user={null} />
    </div>
  );
}
