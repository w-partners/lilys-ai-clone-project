const logger = require('../utils/logger');

module.exports = (req, res, next) => {
  // Check if user is authenticated (should come after auth middleware)
  if (!req.user) {
    logger.warn('Admin middleware: No user in request');
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  // Check if user has admin or operator role
  if (req.user.role !== 'admin' && req.user.role !== 'operator') {
    logger.warn(`Admin middleware: Unauthorized access attempt by user ${req.user.phone}`);
    return res.status(403).json({
      success: false,
      error: 'Admin privileges required'
    });
  }

  next();
};