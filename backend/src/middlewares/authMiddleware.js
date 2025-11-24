const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token' });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Malformed token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    console.log('Authenticated user:', req.user.id);
    return next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid token' });
  }
}

function adminMiddleware(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin required' });
  next();
}

module.exports = { authMiddleware, adminMiddleware };
