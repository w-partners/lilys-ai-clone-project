const Queue = require('bull');
const Redis = require('ioredis');
const logger = require('../utils/logger');

class QueueService {
  constructor() {
    // Redis connection
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });

    // Create queue
    this.aiQueue = new Queue('AI processing queue', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined
      },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    });

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.aiQueue.on('completed', (job, result) => {
      logger.info(`Job ${job.id} completed successfully`, {
        jobId: job.data.jobId,
        processingTime: job.finishedOn - job.processedOn
      });
    });

    this.aiQueue.on('failed', (job, err) => {
      logger.error(`Job ${job.id} failed:`, {
        jobId: job.data.jobId,
        error: err.message,
        attempts: job.attemptsMade
      });
    });

    this.aiQueue.on('stalled', (job) => {
      logger.warn(`Job ${job.id} stalled`, {
        jobId: job.data.jobId
      });
    });
  }

  async addJob(jobType, jobData, options = {}) {
    try {
      const job = await this.aiQueue.add(jobType, jobData, {
        priority: options.priority || 0,
        delay: options.delay || 0,
        ...options
      });

      logger.info(`Job ${job.id} added to queue`, {
        jobId: jobData.jobId,
        jobType,
        priority: options.priority || 0
      });

      return job;
    } catch (error) {
      logger.error('Failed to add job to queue:', error);
      throw error;
    }
  }

  async getJob(jobId) {
    try {
      // Find job by custom jobId in data
      const jobs = await this.aiQueue.getJobs(['waiting', 'active', 'completed', 'failed']);
      const job = jobs.find(j => j.data.jobId === jobId);
      
      if (!job) {
        return null;
      }

      return {
        id: job.id,
        status: await job.getState(),
        progress: job.progress(),
        data: job.data,
        result: job.returnvalue || null,
        error: job.failedReason || null,
        createdAt: new Date(job.timestamp),
        processedAt: job.processedOn ? new Date(job.processedOn) : null,
        completedAt: job.finishedOn ? new Date(job.finishedOn) : null,
        attemptsMade: job.attemptsMade
      };
    } catch (error) {
      logger.error(`Failed to get job ${jobId}:`, error);
      throw error;
    }
  }

  async getQueueStats() {
    try {
      const [waiting, active, completed, failed] = await Promise.all([
        this.aiQueue.getWaiting(),
        this.aiQueue.getActive(),
        this.aiQueue.getCompleted(),
        this.aiQueue.getFailed()
      ]);

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        total: waiting.length + active.length + completed.length + failed.length
      };
    } catch (error) {
      logger.error('Failed to get queue stats:', error);
      throw error;
    }
  }

  async pauseQueue() {
    await this.aiQueue.pause();
    logger.info('Queue paused');
  }

  async resumeQueue() {
    await this.aiQueue.resume();
    logger.info('Queue resumed');
  }

  async clearQueue() {
    await this.aiQueue.empty();
    logger.info('Queue cleared');
  }

  async close() {
    await this.aiQueue.close();
    await this.redis.disconnect();
    logger.info('Queue service closed');
  }
}

module.exports = QueueService;