const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * Optional authentication middleware
 * Attempts to authenticate user if token is provided, but allows request to proceed regardless
 */
const optionalAuth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      // No token provided, but that's okay for optional auth
      req.user = null;
      return next();
    }

    // Try to verify the token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      logger.debug('User authenticated (optional)', { userId: decoded.id, email: decoded.email });
    } catch (error) {
      // Token is invalid, but for optional auth we still proceed
      logger.debug('Optional auth failed, proceeding without user', { error: error.message });
      req.user = null;
    }
    
    next();
  } catch (error) {
    logger.error('Error in optional auth middleware:', error);
    // Even if something goes wrong, we proceed for optional auth
    req.user = null;
    next();
  }
};

module.exports = optionalAuth;