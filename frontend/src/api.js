import axios from "axios";

const API = axios.create({
  baseURL: 'https://fast-delivery-4gog.onrender.com/api',
  // baseURL: "http://localhost:4800/api",
});

// Request interceptor to add token if it exists
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token"); // get token from localStorage

    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`; // attach token if available
    }
    // If no token, just send request without Authorization header
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default API;
