const Redis = require('ioredis');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.client = null;
    this.enabled = false;
    this.ttl = {
      short: 300,      // 5 minutes
      medium: 3600,    // 1 hour
      long: 86400,     // 24 hours
      summaries: 1800, // 30 minutes for summaries
      user: 600        // 10 minutes for user data
    };
    
    this.init();
  }

  init() {
    try {
      this.client = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_CACHE_DB || 2, // Use different DB for cache
        keyPrefix: 'cache:',
        retryStrategy: (times) => {
          if (times > 3) {
            logger.error('Redis cache connection failed after 3 retries');
            this.enabled = false;
            return null;
          }
          return Math.min(times * 50, 2000);
        }
      });

      this.client.on('connect', () => {
        logger.info('Redis cache service connected');
        this.enabled = true;
      });

      this.client.on('error', (err) => {
        logger.error('Redis cache error:', err);
        this.enabled = false;
      });
    } catch (error) {
      logger.error('Failed to initialize cache service:', error);
      this.enabled = false;
    }
  }

  /**
   * Generate cache key
   * @param {string} namespace - Cache namespace
   * @param {string|Object} identifier - Unique identifier
   * @returns {string} Cache key
   */
  generateKey(namespace, identifier) {
    if (typeof identifier === 'object') {
      identifier = JSON.stringify(identifier);
    }
    return `${namespace}:${identifier}`;
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} Cached value or null
   */
  async get(key) {
    if (!this.enabled) return null;

    try {
      const value = await this.client.get(key);
      if (value) {
        logger.debug(`Cache hit: ${key}`);
        return JSON.parse(value);
      }
      logger.debug(`Cache miss: ${key}`);
      return null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, ttl = this.ttl.medium) {
    if (!this.enabled) return false;

    try {
      const serialized = JSON.stringify(value);
      await this.client.set(key, serialized, 'EX', ttl);
      logger.debug(`Cache set: ${key} (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Success status
   */
  async delete(key) {
    if (!this.enabled) return false;

    try {
      await this.client.del(key);
      logger.debug(`Cache delete: ${key}`);
      return true;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Clear cache by pattern
   * @param {string} pattern - Key pattern to match
   * @returns {Promise<number>} Number of keys deleted
   */
  async clearPattern(pattern) {
    if (!this.enabled) return 0;

    try {
      const keys = await this.client.keys(`cache:${pattern}`);
      if (keys.length === 0) return 0;

      const pipeline = this.client.pipeline();
      keys.forEach(key => pipeline.del(key.replace('cache:', '')));
      await pipeline.exec();

      logger.info(`Cleared ${keys.length} cache keys matching pattern: ${pattern}`);
      return keys.length;
    } catch (error) {
      logger.error('Cache clear pattern error:', error);
      return 0;
    }
  }

  /**
   * Invalidate user-related cache
   * @param {number} userId - User ID
   * @returns {Promise<void>}
   */
  async invalidateUser(userId) {
    await this.clearPattern(`user:${userId}:*`);
    await this.clearPattern(`summaries:${userId}:*`);
  }

  /**
   * Cache wrapper for async functions
   * @param {string} key - Cache key
   * @param {Function} fn - Async function to cache
   * @param {number} ttl - Time to live
   * @returns {Promise<any>} Cached or fresh result
   */
  async remember(key, fn, ttl = this.ttl.medium) {
    // Try to get from cache
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    try {
      const result = await fn();
      await this.set(key, result, ttl);
      return result;
    } catch (error) {
      logger.error(`Cache remember error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache stats
   */
  async getStats() {
    if (!this.enabled) {
      return { enabled: false };
    }

    try {
      const info = await this.client.info('stats');
      const dbSize = await this.client.dbsize();
      
      // Parse relevant stats
      const stats = {
        enabled: true,
        keys: dbSize,
        hits: parseInt(info.match(/keyspace_hits:(\d+)/)?.[1] || 0),
        misses: parseInt(info.match(/keyspace_misses:(\d+)/)?.[1] || 0),
        evictedKeys: parseInt(info.match(/evicted_keys:(\d+)/)?.[1] || 0),
        connectedClients: parseInt(info.match(/connected_clients:(\d+)/)?.[1] || 0)
      };

      // Calculate hit ratio
      const total = stats.hits + stats.misses;
      stats.hitRatio = total > 0 ? (stats.hits / total * 100).toFixed(2) + '%' : '0%';

      return stats;
    } catch (error) {
      logger.error('Failed to get cache stats:', error);
      return { enabled: true, error: error.message };
    }
  }

  /**
   * Middleware for caching API responses
   * @param {Object} options - Cache options
   * @returns {Function} Express middleware
   */
  middleware(options = {}) {
    const {
      ttl = this.ttl.short,
      keyGenerator = (req) => `api:${req.method}:${req.originalUrl}`,
      condition = (req) => req.method === 'GET',
      excludeAuth = false
    } = options;

    return async (req, res, next) => {
      // Skip if cache is disabled or condition not met
      if (!this.enabled || !condition(req)) {
        return next();
      }

      // Skip if authenticated requests should be excluded
      if (excludeAuth && req.user) {
        return next();
      }

      const key = keyGenerator(req);

      // Try to serve from cache
      const cached = await this.get(key);
      if (cached) {
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }

      // Store original json method
      const originalJson = res.json;

      // Override json method to cache response
      res.json = (body) => {
        res.set('X-Cache', 'MISS');
        
        // Cache successful responses only
        if (res.statusCode >= 200 && res.statusCode < 300) {
          this.set(key, body, ttl).catch(err => {
            logger.error('Failed to cache response:', err);
          });
        }

        return originalJson.call(res, body);
      };

      next();
    };
  }
}

// Export singleton instance
module.exports = new CacheService();