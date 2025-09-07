const Queue = require('bull');
const redis = require('redis');
const { processYoutubeJob } = require('../workers/youtubeWorker');
const logger = require('../utils/logger');

let youtubeQueue = null;
let redisClient = null;

/**
 * 큐 시스템 초기화
 */
async function initializeQueue() {
  try {
    // Redis 클라이언트 초기화
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redisClient = redis.createClient({ url: redisUrl });
    
    redisClient.on('error', (err) => {
      logger.error('Redis client error:', err);
    });
    
    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    await redisClient.connect();

    // Bull 큐 초기화
    const redisConfig = {
      redis: {
        port: 6379,
        host: process.env.REDIS_HOST || 'localhost',
        password: process.env.REDIS_PASSWORD || undefined,
        db: 0
      }
    };

    youtubeQueue = new Queue('youtube processing', redisConfig);

    // 작업 처리기 등록
    youtubeQueue.process('youtube-analysis', 3, processYoutubeJob);

    // 큐 이벤트 리스너
    youtubeQueue.on('completed', (job, result) => {
      logger.info(`Job ${job.id} completed successfully`);
    });

    youtubeQueue.on('failed', (job, error) => {
      logger.error(`Job ${job.id} failed:`, error.message);
    });

    youtubeQueue.on('stalled', (job) => {
      logger.warn(`Job ${job.id} stalled`);
    });

    youtubeQueue.on('progress', (job, progress) => {
      logger.info(`Job ${job.id} progress: ${progress}%`);
    });

    // 큐 정리 (완료된 작업 자동 삭제)
    youtubeQueue.clean(24 * 60 * 60 * 1000, 'completed'); // 24시간 후 완료된 작업 삭제
    youtubeQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed'); // 7일 후 실패한 작업 삭제

    logger.info('Queue system initialized successfully');

  } catch (error) {
    logger.error('Failed to initialize queue system:', error);
    throw error;
  }
}

/**
 * YouTube 처리 작업을 큐에 추가
 * @param {Object} jobData - 작업 데이터
 * @returns {Object} Bull Job 인스턴스
 */
async function addYoutubeJob(jobData) {
  try {
    if (!youtubeQueue) {
      throw new Error('Queue not initialized');
    }

    const options = {
      removeOnComplete: 10, // 완료된 작업 10개만 보관
      removeOnFail: 50,     // 실패한 작업 50개만 보관
      attempts: 3,          // 최대 3회 재시도
      backoff: {
        type: 'exponential',
        delay: 5000         // 5초부터 시작하여 지수적 증가
      },
      delay: 0              // 즉시 실행
    };

    const job = await youtubeQueue.add('youtube-analysis', jobData, options);
    
    logger.info(`YouTube job added to queue: ${job.id}`, {
      jobId: jobData.jobId,
      url: jobData.sourceUrl
    });

    return job;

  } catch (error) {
    logger.error('Failed to add YouTube job to queue:', error);
    throw error;
  }
}

/**
 * 작업 상태 조회
 * @param {string} bullJobId - Bull 작업 ID
 * @returns {Object} 작업 상태 정보
 */
async function getJobStatus(bullJobId) {
  try {
    if (!youtubeQueue) {
      throw new Error('Queue not initialized');
    }

    const job = await youtubeQueue.getJob(bullJobId);
    
    if (!job) {
      return { status: 'not_found' };
    }

    const state = await job.getState();
    const progress = job.progress();

    return {
      id: job.id,
      status: state,
      progress: progress,
      data: job.data,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
      attempts: job.attemptsMade,
      maxAttempts: job.opts.attempts
    };

  } catch (error) {
    logger.error(`Failed to get job status for ${bullJobId}:`, error);
    return { status: 'error', error: error.message };
  }
}

/**
 * 작업 취소
 * @param {string} bullJobId - Bull 작업 ID
 * @returns {boolean} 취소 성공 여부
 */
async function cancelJob(bullJobId) {
  try {
    if (!youtubeQueue) {
      throw new Error('Queue not initialized');
    }

    const job = await youtubeQueue.getJob(bullJobId);
    
    if (!job) {
      return false;
    }

    await job.remove();
    logger.info(`Job ${bullJobId} cancelled successfully`);
    return true;

  } catch (error) {
    logger.error(`Failed to cancel job ${bullJobId}:`, error);
    return false;
  }
}

/**
 * 큐 통계 조회
 * @returns {Object} 큐 통계 정보
 */
async function getQueueStats() {
  try {
    if (!youtubeQueue) {
      return { error: 'Queue not initialized' };
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      youtubeQueue.getWaiting(),
      youtubeQueue.getActive(),
      youtubeQueue.getCompleted(),
      youtubeQueue.getFailed(),
      youtubeQueue.getDelayed()
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      total: waiting.length + active.length + completed.length + failed.length + delayed.length
    };

  } catch (error) {
    logger.error('Failed to get queue stats:', error);
    return { error: error.message };
  }
}

/**
 * 큐 정리 (완료/실패한 작업 제거)
 * @param {number} olderThan - 몇 시간 이전 작업 제거 (기본 24시간)
 */
async function cleanQueue(olderThan = 24 * 60 * 60 * 1000) {
  try {
    if (!youtubeQueue) {
      throw new Error('Queue not initialized');
    }

    const cleanedCompleted = await youtubeQueue.clean(olderThan, 'completed');
    const cleanedFailed = await youtubeQueue.clean(olderThan * 7, 'failed'); // 실패한 작업은 7배 더 오래 보관

    logger.info(`Queue cleaned: ${cleanedCompleted.length} completed, ${cleanedFailed.length} failed jobs removed`);

    return {
      completed: cleanedCompleted.length,
      failed: cleanedFailed.length
    };

  } catch (error) {
    logger.error('Failed to clean queue:', error);
    throw error;
  }
}

/**
 * Redis 클라이언트 조회
 * @returns {Object} Redis 클라이언트
 */
function getRedisClient() {
  return redisClient;
}

/**
 * 큐 시스템 종료
 */
async function shutdown() {
  try {
    if (youtubeQueue) {
      await youtubeQueue.close();
      logger.info('YouTube queue closed');
    }

    if (redisClient) {
      await redisClient.quit();
      logger.info('Redis client disconnected');
    }

  } catch (error) {
    logger.error('Error during queue shutdown:', error);
  }
}

// 프로세스 종료 시 큐 정리
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = {
  initializeQueue,
  addYoutubeJob,
  getJobStatus,
  cancelJob,
  getQueueStats,
  cleanQueue,
  getRedisClient,
  shutdown
};