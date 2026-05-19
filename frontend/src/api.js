import axios from "axios";

const API_KEY = import.meta.env.VITE_API_KEY || null;
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

const API = axios.create({
  baseURL: BASE_URL,
});

// Request interceptor to add token if it exists
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token"); // get token from localStorage

    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`; // attach token if available
    }
    // Attach API key from frontend .env if provided
    if (API_KEY) {
      config.headers["x-api-key"] = API_KEY;
    }
    // If no token, just send request without Authorization header
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export default API;
