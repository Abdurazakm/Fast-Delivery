// Load environment variables
require("dotenv").config();

const express = require("express");
const http = require("http");
const morgan = require("morgan");
const cors = require("cors");
const { initSocket } = require("./src/socket");

// Import routes
const authRoutes = require("./src/routes/authRoutes");
const orderRoutes = require("./src/routes/orderRoutes");
const adminRoutes = require("./src/routes/adminRoutes");
const availabilityRoutes = require("./src/routes/availability");
const notificationsRoutes = require("./src/routes/notificationsRoutes");

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// API Routes
app.use("/api/auth", authRoutes); // Handles user & admin login/signup
app.use("/api/orders", orderRoutes); // Handles all order-related endpoints
app.use("/api/admin", adminRoutes); // Admin dashboard routes
app.use("/api/availability", availabilityRoutes); // Availability routes
app.use("/api/notifications", notificationsRoutes); // Push notification routes

// ✅ Add server time route
app.get("/api/server-time", (req, res) => {
  res.json({ serverTime: new Date().toISOString() });
});

// Base route
app.get("/", (req, res) => {
  res.send("Fetan Delivery API is running successfully...");
});

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.stack);
  res.status(500).json({ message: "Server error", error: err.message });
});

// Start the server
const PORT = process.env.PORT || 4000;
initSocket(server);
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
