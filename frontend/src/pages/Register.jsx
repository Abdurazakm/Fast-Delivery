import React, { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { HiX } from "react-icons/hi";
import API from "../api";
import Toast from "./Toast";

const BLOCK_OPTIONS = Array.from({ length: 28 }, (_, i) => `Block ${i + 1}`);

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    blockNumber: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [Loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  // UI state for custom block select
  const [blockQuery, setBlockQuery] = useState("");
  const [showBlockOptions, setShowBlockOptions] = useState(false);
  const blockRef = useRef(null);
  const optionsRef = useRef(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // 🔐 Password matching
    if (formData.password !== formData.confirmPassword) {
      setToast({
        message: "❌ Passwords do not match!",
        type: "error",
      });
      return;
    }

    setLoading(true);

    try {
      const res = await API.post("/auth/register", formData);

      if (res.status === 201 || res.status === 200) {
        setToast({
          message: "🎉 Registration successful! You can now log in.",
          type: "success",
        });

        setTimeout(() => navigate("/login"), 1500);
      }
    } catch (err) {
      console.error("Registration error:", err);
      const errorMessage =
        err.response?.data?.message || "Something went wrong. Try again!";
      setToast({ message: errorMessage, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // --- Block select handlers (UI only) ---
  const filteredBlocks = BLOCK_OPTIONS.filter((b) =>
    b.toLowerCase().includes(blockQuery.toLowerCase())
  );

  const onBlockInputChange = (e) => {
    setBlockQuery(e.target.value);
    // Also update the form field so the floating label works and submit uses value
    setFormData({ ...formData, blockNumber: e.target.value });
    setShowBlockOptions(true);
  };

  const onSelectBlock = (value) => {
    setFormData({ ...formData, blockNumber: value });
    setBlockQuery(value);
    setShowBlockOptions(false);
  };

  // close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (ev) => {
      if (
        optionsRef.current &&
        !optionsRef.current.contains(ev.target) &&
        blockRef.current &&
        !blockRef.current.contains(ev.target)
      ) {
        setShowBlockOptions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen flex justify-center items-start py-12 px-4 overflow-y-auto bg-gradient-to-b from-amber-50 to-orange-100">
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
      {/* subtle decorative background shapes */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-24 w-96 h-96 rounded-full bg-amber-200/30 blur-3xl animate-[spin_40s_linear_infinite] opacity-60" />
        <div className="absolute right-0 top-40 w-72 h-72 rounded-full bg-amber-100/40 blur-2xl opacity-50" />
      </div>

      {/* HEADER (glass) */}
      <div className="absolute top-8 text-center w-full">
        <div className="inline-flex items-center gap-3 bg-white/40 backdrop-blur-sm px-4 py-2 rounded-full border border-amber-200 shadow-sm">
          <div className="w-3 h-3 rounded-full bg-amber-600 shadow-sm" />
          <h1 className="text-2xl font-extrabold text-amber-800 tracking-wide select-none">
            Fetan Delivery
          </h1>
        </div>
      </div>

      {/* CARD */}
      <div className="relative w-full max-w-md mt-12">
        {/* Animated glowing border (outer) */}
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 opacity-80 blur-xl animate-pulse" />

        {/* Glass card */}
        <div className="relative bg-white/70 backdrop-blur-md border border-amber-200 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-3xl font-bold text-center mb-6 text-amber-800 tracking-tight">
            Create Your Account
          </h2>

          {error && (
            <div className="bg-red-100 text-red-700 p-2 mb-4 rounded-md text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Floating input helper component appearance is done via peer classes */}
            {/* Full Name */}
            <div className="relative">
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder=" "
                className="peer w-full p-3 border border-amber-200 rounded-xl bg-white/70 focus:bg-white focus:shadow-md transition duration-200 outline-none
                  focus:ring-4 focus:ring-amber-200/60"
              />
              <label
                className="absolute left-4 -top-2.5 bg-white/70 px-2 text-sm text-amber-700 transform transition-all duration-200
                peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-placeholder-shown:text-amber-400
                peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-amber-700"
              >
                Full Name
              </label>
            </div>

            {/* Phone */}
            <div className="relative">
              <input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                placeholder=" "
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

            {/* Better Block Select UI (type or choose) */}
            <div className="relative" ref={blockRef}>
              <input
                type="text"
                name="blockNumber"
                value={formData.blockNumber}
                onChange={onBlockInputChange}
                onFocus={() => setShowBlockOptions(true)}
                placeholder=" "
                autoComplete="off"
                className="peer w-full p-3 border border-amber-200 rounded-xl bg-white/70 focus:bg-white focus:shadow-md transition duration-200 outline-none
                  focus:ring-4 focus:ring-amber-200/60"
                aria-haspopup="listbox"
                aria-expanded={showBlockOptions}
              />
              <label
                className="absolute left-4 -top-2.5 bg-white/70 px-2 text-sm text-amber-700 transform transition-all duration-200
                peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-placeholder-shown:text-amber-400
                peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-amber-700"
              >
                Block Number
              </label>

              {/* custom dropdown */}
              <div
                ref={optionsRef}
                className={`absolute z-40 left-0 right-0 mt-2 max-h-44 overflow-auto rounded-xl border border-amber-100 bg-white shadow-lg transition-all duration-150
                  ${
                    showBlockOptions
                      ? "opacity-100 scale-100"
                      : "opacity-0 scale-95 pointer-events-none"
                  }`}
                role="listbox"
              >
                {/* filter + quick clear */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-amber-50">
                  <div className="text-xs text-amber-600 font-medium">
                    Choose a block
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setBlockQuery("");
                      setFormData({ ...formData, blockNumber: "" });
                      setShowBlockOptions(true);
                      // focus back to input
                      blockRef.current?.querySelector("input")?.focus?.();
                    }}
                    className="text-xs text-amber-500 hover:text-amber-700"
                  >
                    Clear
                  </button>
                </div>

                <ul className="p-2 space-y-1">
                  {filteredBlocks.length === 0 ? (
                    <li className="px-3 py-2 text-sm text-gray-500 select-none">
                      No blocks match
                    </li>
                  ) : (
                    filteredBlocks.map((opt) => (
                      <li
                        key={opt}
                        role="option"
                        onMouseDown={(e) => {
                          // use onMouseDown to prevent blur before click
                          e.preventDefault();
                          onSelectBlock(opt);
                        }}
                        className="px-3 py-2 rounded-lg cursor-pointer hover:bg-amber-50 hover:text-amber-800 text-amber-700"
                      >
                        {opt}
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>

            {/* Password */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                placeholder=" "
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
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-3 text-amber-700 hover:text-amber-900 transition"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
              </button>
            </div>

            {/* Confirm Password */}
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                minLength={6}
                placeholder=" "
                className="peer w-full p-3 border border-amber-200 rounded-xl bg-white/70 focus:bg-white focus:shadow-md transition duration-200 outline-none
                  focus:ring-4 focus:ring-amber-200/60"
              />
              <label
                className="absolute left-4 -top-2.5 bg-white/70 px-2 text-sm text-amber-700 transform transition-all duration-200
                peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-placeholder-shown:text-amber-400
                peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-amber-700"
              >
                Confirm Password
              </label>

              <button
                type="button"
                onClick={() => setShowConfirmPassword((s) => !s)}
                className="absolute right-3 top-3 text-amber-700 hover:text-amber-900 transition"
                aria-label={
                  showConfirmPassword ? "Hide password" : "Show password"
                }
              >
                {showConfirmPassword ? (
                  <FaEyeSlash size={18} />
                ) : (
                  <FaEye size={18} />
                )}
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={Loading}
              className={`w-full bg-amber-600 text-white p-3 rounded-xl font-medium
    transition-all duration-300 flex items-center justify-center gap-2
    hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {Loading ? (
                <>
                  <span
                    className="inline-block h-4 w-4 border-2 border-white border-t-transparent 
        rounded-full animate-spin"
                  ></span>
                  Registering...
                </>
              ) : (
                "Register"
              )}
            </button>
          </form>

          <p className="mt-4 text-center text-amber-900 text-sm">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-amber-700 font-semibold hover:underline"
            >
              Login
            </Link>
          </p>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default Register;
