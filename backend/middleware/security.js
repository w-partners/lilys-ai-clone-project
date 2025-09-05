const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * Enhanced security headers using Helmet
 */
const securityHeaders = () => {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  });
};

/**
 * Rate limiting configurations for different endpoints
 */
const rateLimiters = {
  // General API rate limit
  general: rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        userId: req.user?.id
      });
      res.status(429).json({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: res.getHeader('Retry-After')
      });
    }
  }),

  // Stricter limit for auth endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    skipSuccessfulRequests: true, // Don't count successful logins
    message: 'Too many authentication attempts, please try again later.'
  }),

  // File upload rate limit
  upload: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 uploads per hour
    message: 'Upload limit exceeded, please try again later.'
  }),

  // AI processing rate limit
  aiProcessing: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // 50 AI requests per hour
    message: 'AI processing limit exceeded, please try again later.'
  })
};

/**
 * Input sanitization middleware
 */
const sanitizeInput = (req, res, next) => {
  // Recursively sanitize object
  const sanitize = (obj) => {
    if (typeof obj !== 'object' || obj === null) {
      if (typeof obj === 'string') {
        // Remove potential XSS attempts
        return obj
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
          .trim();
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitize(value);
    }
    return sanitized;
  };

  // Sanitize body, query, and params
  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);

  next();
};

/**
 * SQL injection prevention for Sequelize queries
 */
const preventSQLInjection = (req, res, next) => {
  const suspiciousPatterns = [
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/i,
    /(--)|(\\\*)|(\\\*\/)|(\\\\\*)/,
    /(\bor\b\s*\d+\s*=\s*\d+)/i,
    /(\band\b\s*\d+\s*=\s*\d+)/i
  ];

  const checkForInjection = (value) => {
    if (typeof value !== 'string') return false;
    return suspiciousPatterns.some(pattern => pattern.test(value));
  };

  const checkObject = (obj) => {
    for (const [key, value] of Object.entries(obj)) {
      if (checkForInjection(value)) {
        logger.warn('Potential SQL injection attempt detected', {
          ip: req.ip,
          path: req.path,
          userId: req.user?.id,
          key,
          value
        });
        return true;
      }
      if (typeof value === 'object' && value !== null) {
        if (checkObject(value)) return true;
      }
    }
    return false;
  };

  // Check all input sources
  if (req.body && checkObject(req.body)) {
    return res.status(400).json({
      error: 'Invalid input',
      message: 'Request contains potentially malicious content'
    });
  }

  if (req.query && checkObject(req.query)) {
    return res.status(400).json({
      error: 'Invalid input',
      message: 'Request contains potentially malicious content'
    });
  }

  next();
};

/**
 * File upload security
 */
const fileUploadSecurity = {
  // Allowed MIME types
  allowedMimeTypes: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/html',
    'audio/mpeg',
    'audio/wav',
    'video/mp4',
    'video/webm'
  ],

  // Validate file upload
  validateFile: (req, res, next) => {
    if (!req.file) {
      return next();
    }

    const file = req.file;

    // Check file size
    const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return res.status(400).json({
        error: 'File too large',
        message: `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`
      });
    }

    // Check MIME type
    if (!fileUploadSecurity.allowedMimeTypes.includes(file.mimetype)) {
      return res.status(400).json({
        error: 'Invalid file type',
        message: 'File type not allowed'
      });
    }

    // Check file extension
    const allowedExtensions = ['.pdf', '.docx', '.txt', '.html', '.mp3', '.wav', '.mp4', '.webm'];
    const fileExtension = file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0];
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      return res.status(400).json({
        error: 'Invalid file extension',
        message: 'File extension not allowed'
      });
    }

    next();
  }
};

/**
 * API key validation for external integrations
 */
const validateAPIKey = (req, res, next) => {
  const apiKey = req.header('X-API-Key');
  
  if (!apiKey) {
    return res.status(401).json({
      error: 'API key required',
      message: 'Please provide an API key in the X-API-Key header'
    });
  }

  // In production, validate against database or environment variable
  const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
  
  if (!validApiKeys.includes(apiKey)) {
    logger.warn('Invalid API key attempt', {
      ip: req.ip,
      apiKey: apiKey.substring(0, 8) + '...'
    });
    return res.status(401).json({
      error: 'Invalid API key',
      message: 'The provided API key is not valid'
    });
  }

  next();
};

/**
 * CORS configuration for production
 */
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
    
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked request', { origin, ip: req.ip });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  maxAge: 86400 // 24 hours
};

/**
 * Security monitoring and logging
 */
const securityMonitoring = (req, res, next) => {
  // Log security-relevant events
  const securityEvent = {
    timestamp: new Date().toISOString(),
    ip: req.ip,
    method: req.method,
    path: req.path,
    userAgent: req.headers['user-agent'],
    userId: req.user?.id,
    headers: {
      referer: req.headers.referer,
      origin: req.headers.origin
    }
  };

  // Detect suspicious patterns
  const suspiciousPatterns = [
    { pattern: /\.\.\//g, type: 'path_traversal' },
    { pattern: /<script/i, type: 'xss_attempt' },
    { pattern: /eval\(/i, type: 'code_injection' },
    { pattern: /base64_decode/i, type: 'encoding_exploit' }
  ];

  const url = req.originalUrl;
  for (const { pattern, type } of suspiciousPatterns) {
    if (pattern.test(url)) {
      logger.warn('Suspicious request pattern detected', {
        ...securityEvent,
        patternType: type,
        url
      });
    }
  }

  next();
};

module.exports = {
  securityHeaders,
  rateLimiters,
  sanitizeInput,
  preventSQLInjection,
  fileUploadSecurity,
  validateAPIKey,
  corsOptions,
  securityMonitoring
};