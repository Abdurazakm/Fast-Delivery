// Load environment variables
require('dotenv').config();

const express = require('express');
const morgan = require('morgan');
const cors = require('cors');

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// API Routes
app.use('/api/auth', authRoutes);     // Handles user & admin login/signup
app.use('/api/orders', orderRoutes);  // Handles all order-related endpoints
app.use('/api/admin', adminRoutes);   // Admin dashboard routes

// Base route
app.get('/', (req, res) => {
  res.send('🥙 Ertib Delivery API is running successfully...');
});

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({ message: 'Server error', error: err.message });
});

// Start the server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
