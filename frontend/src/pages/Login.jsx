import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { HiX } from "react-icons/hi";

import API from "../api";

const Login = () => {
  const [formData, setFormData] = useState({ phone: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await API.post("/auth/login", formData);
      const { token, user } = res.data;
      const { role, name } = user;

      localStorage.setItem("token", token);
      localStorage.setItem("role", role);
      localStorage.setItem("name", name);

      if (role?.toLowerCase() === "admin") {
        navigate("/availability");
      } else {
        navigate("/");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err.response?.data?.message || "Invalid phone or password!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-start py-12 px-4 overflow-y-auto bg-gradient-to-b from-amber-50 to-orange-100 relative">
      {/* Top Right Auth Buttons */}
      <Link
        to="/"
        className="
      fixed top-4 right-4 z-50 
      inline-flex items-center justify-center 
      p-2 bg-amber-500 hover:bg-amber-600 
      text-white font-medium rounded-full 
      shadow-lg transition-all duration-200
    "
      >
        <HiX size={26} />
      </Link>
      {/* Decorative background shapes */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-24 w-96 h-96 rounded-full bg-amber-200/30 blur-3xl animate-[spin_40s_linear_infinite] opacity-60" />
        <div className="absolute right-0 top-40 w-72 h-72 rounded-full bg-amber-100/40 blur-2xl opacity-50" />
      </div>

      {/* Header */}
      <div className="absolute top-8 text-center w-full">
        <div className="inline-flex items-center gap-3 bg-white/40 backdrop-blur-sm px-4 py-2 rounded-full border border-amber-200 shadow-sm">
          <div className="w-3 h-3 rounded-full bg-amber-600 shadow-sm" />
          <h1 className="text-2xl font-extrabold text-amber-800 tracking-wide select-none">
            Fetan Delivery
          </h1>
        </div>
      </div>

      {/* Login Card */}
      <div className="relative w-full max-w-md mt-24">
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 opacity-80 blur-xl animate-pulse" />
        <div className="relative bg-white/70 backdrop-blur-md border border-amber-200 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-3xl font-bold text-center mb-6 text-amber-800 tracking-tight">
            Welcome Back
          </h2>

          {error && (
            <div className="bg-red-100 text-red-700 p-2 mb-4 rounded-md text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Phone */}
            <div className="relative">
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder=" "
                required
                className="peer w-full p-3 border border-amber-200 rounded-xl bg-white/70 focus:bg-white focus:shadow-md transition duration-200 outline-none
                  focus:ring-4 focus:ring-amber-200/60"
              />
              <label
                className="absolute left-4 -top-2.5 bg-white/70 px-2 text-sm text-amber-700 transform transition-all duration-200
                peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-placeholder-shown:text-amber-400
                peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-amber-700"
              >
                Phone Number
              </label>
            </div>

            {/* Password */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder=" "
                required
                className="peer w-full p-3 border border-amber-200 rounded-xl bg-white/70 focus:bg-white focus:shadow-md transition duration-200 outline-none
                  focus:ring-4 focus:ring-amber-200/60"
              />
              <label
                className="absolute left-4 -top-2.5 bg-white/70 px-2 text-sm text-amber-700 transform transition-all duration-200
                peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-placeholder-shown:text-amber-400
                peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-amber-700"
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-amber-700 hover:text-amber-900 transition"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
              </button>
            </div>

            {/* Submit Button with spinner */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-600 text-white py-3 rounded-xl font-semibold shadow-md flex items-center justify-center gap-2 hover:bg-amber-700 transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </button>
          </form>

          <p className="mt-4 text-center text-amber-900 text-sm">
            Don’t have an account?{" "}
            <Link
              to="/register"
              className="text-amber-700 font-semibold hover:underline"
            >
              Create one here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
