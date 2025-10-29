import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../api"; // import your Axios instance

const Login = () => {
  const [formData, setFormData] = useState({ phone: "", password: "" });
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
      const { token, user } = res.data; // ✅ destructure correctly
      const { role, name } = user;

      // Save to localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("role", role);
      localStorage.setItem("name", name);

      console.log("User role:", role);

      // Redirect based on role
      if (role?.toLowerCase() === "admin") {
        navigate("/admin");
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
    <div className="min-h-screen flex justify-center items-center bg-gray-100 px-4">
      <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
          Welcome Back to Ertib Delivery 🥙
        </h2>

        {error && (
          <div className="bg-red-100 text-red-700 p-2 mb-4 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-medium text-gray-700">
              Phone Number
            </label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-400"
              placeholder="e.g. +251900000000"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-400"
              placeholder="Your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 text-white py-2 rounded-lg font-semibold hover:bg-amber-600 transition disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="mt-4 text-center text-gray-600 text-sm">
          Don’t have an account?{" "}
          <Link
            to="/register"
            className="text-amber-600 font-medium hover:underline"
          >
            Create one here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
