const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    
    logger.debug('User authenticated', { userId: decoded.id, email: decoded.email });
    next();
  } catch (error) {
    logger.warn('Authentication failed:', { error: error.message });
    res.status(401).json({ error: 'Invalid token.' });
  }
};

module.exports = auth;