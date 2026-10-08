import React, { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import {
  Phone,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Utensils,
  ShieldCheck,
  Zap,
  MapPin,
  Sparkles,
} from "lucide-react";
import API from "../api";
import MobileBottomNav from "../components/MobileBottomNav";
import Navbar from "../components/Navbar";
import Logo from "../components/Logo";

export default function Login({ onLoginSuccess }) {
  const [formData, setFormData] = useState({ phone: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await API.post("/auth/login", formData);
      const { token, user } = res.data;
      const { role, name } = user;
      const roleLower = (role || "").toLowerCase();

      localStorage.setItem("token", token);
      localStorage.setItem("role", role);
      localStorage.setItem("name", name);

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

      if (roleLower === "admin") {
        navigate("/availability");
      } else if (
        roleLower === "employ" ||
        roleLower === "employee" ||
        roleLower === "supleyer"
      ) {
        navigate("/admin");
      } else {
        const destination = location.state?.from || "/";
        navigate(destination);
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(
        err.response?.data?.message ||
          "Invalid phone number or password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/50 via-white to-gray-50/40 text-gray-900 flex flex-col justify-between">
      {/* Responsive Top Navbar */}
      <Navbar user={null} />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-6 sm:pt-12 pb-24 sm:pb-12 flex flex-col justify-center">
        <div className="lg:grid lg:grid-cols-12 lg:gap-12 items-center">
          {/* Left Column (Desktop Showcase, hidden on mobile) */}
          <div className="hidden lg:flex lg:col-span-6 flex-col space-y-6 pr-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100/90 border border-amber-200 text-amber-900 text-xs font-black w-fit">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>AASTU Campus Food Delivery 🛵</span>
            </div>

            <h1 className="text-4xl xl:text-5xl font-black text-gray-950 tracking-tight leading-[1.15]">
              Hot & Fresh Food, Delivered Directly to Your Dorm.
            </h1>

            <p className="text-sm text-gray-600 leading-relaxed font-medium">
              Order your favorite Leyla Ertib, hot layered Fetira, crispy Sambusa and fresh doughnuts without leaving your room. Delivery riders bring orders straight to your dorm gate across Blocks 1–28.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-gray-200/80 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-gray-950">Fast 15-Minute Delivery</h4>
                  <p className="text-[11px] text-gray-500 font-medium">Dedicated campus riders stationed directly at dorm clusters.</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-gray-200/80 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-gray-950">Saved Campus Block & Room</h4>
                  <p className="text-[11px] text-gray-500 font-medium">One-tap address auto-fill for lightning checkout.</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-gray-200/80 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-gray-950">Flexible Payment Options</h4>
                  <p className="text-[11px] text-gray-500 font-medium">Pay via Telebirr, CBE mobile banking, or Cash on Delivery.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (Auth Card) */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto">
            {/* Segmented Auth Navigation Control */}
            <div className="bg-gray-100/90 p-1 rounded-2xl flex items-center mb-6 border border-gray-200/80">
              <button
                type="button"
                className="flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all bg-white text-gray-950 shadow-xs cursor-default"
              >
                Sign In
              </button>
              <Link
                to="/register"
                className="flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-gray-500 hover:text-gray-900 transition-all text-center"
              >
                Create Account
              </Link>
            </div>

            {/* Card */}
            <section className="bg-white rounded-3xl border border-gray-200/90 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-3.5">
            <Logo variant="mark" size={42} className="shrink-0 mt-0.5" />
            <div>
              <h1 className="text-2xl font-black text-gray-950 tracking-tight">
                Welcome back 👋
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">
                Sign in with your phone number to order food, track deliveries, and manage your dorm profile.
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
            {/* Phone Number Field */}
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
                Enter your 9-digit or 10-digit Ethiopian mobile number.
              </p>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-extrabold text-gray-800">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white font-extrabold text-base py-3.5 px-6 rounded-2xl shadow-md shadow-amber-200/80 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Switch to Register */}
          <div className="text-center pt-2 border-t border-gray-100">
            <p className="text-xs sm:text-sm text-gray-600 font-medium">
              Don’t have an account yet?{" "}
              <Link
                to="/register"
                className="text-amber-600 hover:text-amber-700 font-black hover:underline"
              >
                Create Account
              </Link>
            </p>
          </div>
        </section>

        {/* Feature Highlights Strip */}
        <div className="grid grid-cols-3 gap-2 mt-6 text-center">
          <div className="p-3 rounded-2xl bg-white/70 border border-gray-200/60 shadow-2xs">
            <Zap className="w-4 h-4 text-amber-600 mx-auto mb-1" />
            <span className="text-[11px] font-bold text-gray-900 block">
              Fast Delivery
            </span>
            <span className="text-[10px] text-gray-400 block font-medium">
              To Dorm Gate
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-white/70 border border-gray-200/60 shadow-2xs">
            <MapPin className="w-4 h-4 text-orange-600 mx-auto mb-1" />
            <span className="text-[11px] font-bold text-gray-900 block">
              Saved Address
            </span>
            <span className="text-[10px] text-gray-400 block font-medium">
              Auto Room Fill
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-white/70 border border-gray-200/60 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
            <span className="text-[11px] font-bold text-gray-900 block">
              Safe & Direct
            </span>
            <span className="text-[10px] text-gray-400 block font-medium">
              AASTU Verified
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

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav user={null} />
    </div>
  );
}
