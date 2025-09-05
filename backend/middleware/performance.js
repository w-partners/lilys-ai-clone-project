const logger = require('../utils/logger');

/**
 * Performance monitoring middleware
 * Tracks response times and logs slow requests
 */
const performanceMonitoring = (options = {}) => {
  const {
    slowThreshold = 1000, // 1 second
    logSlow = true,
    includeBody = false
  } = options;

  return (req, res, next) => {
    const startTime = Date.now();
    const startHrTime = process.hrtime();

    // Store original end function
    const originalEnd = res.end;
    const originalJson = res.json;

    // Track response size
    let responseSize = 0;

    // Override json method to capture response size
    res.json = function(body) {
      responseSize = JSON.stringify(body).length;
      return originalJson.call(this, body);
    };

    // Override end method
    res.end = function(...args) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      const hrDuration = process.hrtime(startHrTime);
      const durationInMs = hrDuration[0] * 1000 + hrDuration[1] / 1000000;

      // Log performance metrics
      const metrics = {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: Math.round(durationInMs * 100) / 100, // Round to 2 decimal places
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        responseSize
      };

      // Add user info if authenticated
      if (req.user) {
        metrics.userId = req.user.id;
      }

      // Log slow requests
      if (duration > slowThreshold && logSlow) {
        logger.warn('Slow request detected', {
          ...metrics,
          threshold: slowThreshold,
          body: includeBody ? req.body : undefined
        });
      }

      // Always log in development
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Request completed', metrics);
      }

      // Emit metrics for monitoring systems
      if (global.metricsCollector && typeof global.metricsCollector.recordResponseTime === 'function') {
        global.metricsCollector.recordResponseTime(metrics);
      }

      // Call original end
      return originalEnd.apply(this, args);
    };

    next();
  };
};

// Memory usage monitoring
const memoryMonitoring = (options = {}) => {
  const {
    interval = 60000, // 1 minute
    threshold = 500 * 1024 * 1024 // 500MB
  } = options;

  setInterval(() => {
    const memUsage = process.memoryUsage();
    const metrics = {
      rss: Math.round(memUsage.rss / 1024 / 1024), // MB
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    };

    // Log if memory usage is high
    if (memUsage.rss > threshold) {
      logger.warn('High memory usage detected', metrics);
    }

    // Emit metrics
    if (global.metricsCollector) {
      global.metricsCollector.recordMemoryUsage(metrics);
    }
  }, interval);
};

// Request counting and rate tracking
class RequestMetrics {
  constructor() {
    this.requests = new Map();
    this.startTime = Date.now();
  }

  record(path, method, statusCode) {
    const key = `${method}:${path}:${statusCode}`;
    const current = this.requests.get(key) || 0;
    this.requests.set(key, current + 1);
  }

  getStats() {
    const uptime = Date.now() - this.startTime;
    const stats = {
      uptime: Math.round(uptime / 1000), // seconds
      totalRequests: 0,
      requestsByEndpoint: {},
      requestsByStatus: {}
    };

    for (const [key, count] of this.requests) {
      const [method, path, status] = key.split(':');
      stats.totalRequests += count;

      // By endpoint
      const endpoint = `${method} ${path}`;
      stats.requestsByEndpoint[endpoint] = (stats.requestsByEndpoint[endpoint] || 0) + count;

      // By status
      stats.requestsByStatus[status] = (stats.requestsByStatus[status] || 0) + count;
    }

    stats.requestsPerSecond = stats.totalRequests / (uptime / 1000);

    return stats;
  }

  reset() {
    this.requests.clear();
    this.startTime = Date.now();
  }
}

// Create global metrics collector
if (!global.metricsCollector) {
  global.metricsCollector = new RequestMetrics();
}

module.exports = {
  performanceMonitoring,
  memoryMonitoring,
  RequestMetrics
};