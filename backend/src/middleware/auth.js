const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token
const authenticate = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authenticated. Please log in.' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or deactivated.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

// Role-based access control
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not allowed to perform this action.`
      });
    }
    next();
  };
};

// Master admin only guard
const masterAdminOnly = authorize('master_admin');

// Check if order is locked (payment received)
const checkOrderLock = async (req, res, next) => {
  const Order = require('../models/Order');
  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found.' });
  }
  if (order.isLocked) {
    return res.status(403).json({
      success: false,
      message: 'This order is locked because payment has been received. No modifications allowed.'
    });
  }
  req.order = order;
  next();
};

module.exports = { authenticate, authorize, masterAdminOnly, checkOrderLock };
