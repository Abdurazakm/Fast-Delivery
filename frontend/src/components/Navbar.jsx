import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Utensils,
  ShoppingBag,
  Bike,
  User,
  LogIn,
  Shield,
  Sparkles,
} from "lucide-react";
import NotificationBell from "./NotificationBell";
import Logo from "./Logo";

export default function Navbar({ user, className = "" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  const role = (user?.role || "").toLowerCase();
  const isAdmin = role === "admin";
  const isStaff = role === "employ" || role === "employee" || role === "supleyer";
  const isAuthenticated = Boolean(user) || Boolean(localStorage.getItem("token"));

  const lastTracking = localStorage.getItem("last_order_tracking");

  const handleTrackClick = (e) => {
    e.preventDefault();
    if (lastTracking) {
      navigate(`/track/${lastTracking}`);
    } else {
      navigate("/");
      setTimeout(() => {
        const trackSection = document.getElementById("track-section");
        if (trackSection) {
          trackSection.scrollIntoView({ behavior: "smooth", block: "center" });
          const input = trackSection.querySelector("input");
          if (input) input.focus();
        }
      }, 100);
    }
  };

  const navLinks = [
    { name: "Home", path: "/", icon: Home },
    { name: "Menu", path: "/menu", icon: Utensils },
    { name: "Order", path: "/order", icon: ShoppingBag, badge: "Hot" },
    { name: "Track", path: "/track", icon: Bike, onClick: handleTrackClick },
  ];

  return (
    <header
      className={`sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200/80 transition-all ${className}`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <Logo
            variant="mark"
            size="md"
            className="group-hover:scale-105 transition-transform"
          />
          <div className="flex flex-col">
            <span className="font-black text-sm sm:text-lg tracking-tight text-gray-950 group-hover:text-amber-600 transition leading-tight">
              Fetan <span className="text-amber-600">Delivery</span>
            </span>
            <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-amber-700 leading-none">
              AASTU Campus
            </span>
          </div>
        </Link>

        {/* Center Desktop Navigation (Desktop & Laptop screens) */}
        <nav
          aria-label="Desktop Navigation"
          className="hidden md:flex items-center gap-1 lg:gap-1.5 bg-gray-100/80 p-1 rounded-2xl border border-gray-200/60"
        >
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isCurrent =
              item.path === "/"
                ? pathname === "/"
                : pathname.startsWith(item.path);

            if (item.onClick) {
              return (
                <button
                  key={item.name}
                  onClick={item.onClick}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    pathname.startsWith("/track")
                      ? "bg-white text-gray-950 shadow-xs"
                      : "text-gray-600 hover:text-gray-950 hover:bg-white/60"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.name}</span>
                </button>
              );
            }

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`relative px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  isCurrent
                    ? "bg-white text-gray-950 shadow-xs font-black"
                    : "text-gray-600 hover:text-gray-950 hover:bg-white/60"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.name}</span>
                {item.badge && (
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full bg-amber-500 text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Action Cluster */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Admin Dashboard shortcut */}
          {isAdmin && (
            <Link
              to="/admin"
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition flex items-center gap-1"
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Admin</span>
              <span>Dashboard</span>
            </Link>
          )}

          {isStaff && !isAdmin && (
            <Link
              to="/admin"
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition flex items-center gap-1"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Staff Portal</span>
            </Link>
          )}

          {/* Desktop User Account Pill or Sign In/Sign Up buttons */}
          {isAuthenticated ? (
            <Link
              to="/profile"
              className={`hidden sm:inline-flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-2xl border transition ${
                pathname === "/profile"
                  ? "bg-amber-50 border-amber-300 text-amber-950"
                  : "bg-white border-gray-200 text-gray-800 hover:border-amber-300 hover:bg-amber-50/50"
              }`}
            >
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-black text-xs shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <span className="text-xs font-bold max-w-[120px] truncate">
                {user?.name || "Profile"}
              </span>
            </Link>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                to="/login"
                className="text-xs font-bold text-gray-700 hover:text-gray-950 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="text-xs font-extrabold text-white bg-amber-500 hover:bg-amber-600 px-3.5 py-1.5 rounded-xl shadow-xs transition"
              >
                Sign Up
              </Link>
            </div>
          )}

          {/* Real-time Notification Bell */}
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
