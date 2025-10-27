import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
  });

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
      const res = await axios.post("http://localhost:4000/api/auth/register", formData);
      if (res.status === 201 || res.status === 200) {
        alert("🎉 Registration successful! You can now log in.");
        navigate("/login");
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.response?.data?.message || "Something went wrong. Try again!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-100 px-4">
      <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
          Create Your Ertib Delivery Account 🥙
        </h2>

        {error && (
          <div className="bg-red-100 text-red-700 p-2 mb-4 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-medium text-gray-700">Full Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-400"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700">Phone Number</label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-400"
              placeholder="e.g. +251900000000"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700">Block Number</label>
            <input
              type="text"
              name="blockNumber"
              value={formData.blockNumber}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-400"
              placeholder="e.g. B12"
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
              minLength={6}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-700 text-white py-2 rounded-lg font-semibold hover:bg-amber-600 transition disabled:opacity-60"
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        <p className="mt-4 text-center text-gray-600 text-sm">
          Already have an account?{" "}
          <Link to="/login" className="text-amber-700 font-medium hover:underline">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
