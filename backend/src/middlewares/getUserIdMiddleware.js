const jwt = require('jsonwebtoken');

// Middleware to get userId or set null for guest
function getUserIdMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    // No token → guest user
    req.userId = null;
    req.userRole = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    req.userId = null;
    req.userRole = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id || null; // set userId from token
    req.userRole = decoded.role || null;
  } catch (err) {
    console.warn('⚠️ Invalid token, proceeding as guest');
    req.userId = null; // treat as guest
    req.userRole = null;
  }

  next();
}

module.exports = {getUserIdMiddleware};
