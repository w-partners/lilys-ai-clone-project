const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { Job, SystemPrompt } = require('../models');
const { addYoutubeJob } = require('../services/queue');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * YouTube 처리 시작
 * POST /api/process/youtube
 */
router.post('/youtube', [
  body('url')
    .isURL({ protocols: ['http', 'https'] })
    .withMessage('유효한 YouTube URL을 입력해주세요.')
    .matches(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)/)
    .withMessage('YouTube URL 형식이 올바르지 않습니다.'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('유효한 이메일 주소를 입력해주세요.'),
  body('systemPromptIds')
    .optional()
    .isArray({ min: 1 })
    .withMessage('최소 1개 이상의 시스템 프롬프트를 선택해주세요.')
], async (req, res) => {
  try {
    // 유효성 검사
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: '입력 데이터가 올바르지 않습니다.',
        details: errors.array()
      });
    }

    const { url, email, systemPromptIds } = req.body;
    const userId = req.user?.id || null;
    const sessionId = req.sessionID || uuidv4();

    // 시스템 프롬프트 처리
    let selectedPromptIds = systemPromptIds;
    if (!selectedPromptIds || selectedPromptIds.length === 0) {
      // 기본 활성 프롬프트 사용
      const defaultPrompts = await SystemPrompt.findAll({
        where: { isActive: true },
        order: [['orderIndex', 'ASC']],
        limit: 6
      });
      selectedPromptIds = defaultPrompts.map(p => p.id);
    }

    if (selectedPromptIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: '활성화된 시스템 프롬프트가 없습니다. 관리자에게 문의하세요.'
      });
    }

    // Job 생성
    const job = await Job.create({
      userId: userId,
      sessionId: sessionId,
      type: 'youtube',
      sourceUrl: url,
      status: 'pending',
      progress: 0,
      email: email,
      metadata: {
        selectedPrompts: selectedPromptIds.length,
        createdBy: userId ? 'user' : 'guest',
        userAgent: req.get('User-Agent'),
        ip: req.ip
      }
    });

    // 큐에 작업 추가
    const bullJob = await addYoutubeJob({
      jobId: job.id,
      sourceUrl: url,
      systemPromptIds: selectedPromptIds,
      userId: userId,
      sessionId: sessionId,
      email: email
    });

    logger.info(`YouTube processing job created: ${job.id}`, {
      url,
      userId,
      sessionId,
      bullJobId: bullJob.id,
      promptCount: selectedPromptIds.length
    });

    res.json({
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        estimatedTime: selectedPromptIds.length * 30, // 초 단위 추정 시간
        message: '처리를 시작했습니다. 실시간 상태 업데이트를 받으려면 WebSocket에 연결하세요.'
      }
    });

  } catch (error) {
    logger.error('YouTube processing start error:', error);
    res.status(500).json({
      success: false,
      error: '처리 시작 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    });
  }
});

/**
 * 작업 상태 조회
 * GET /api/process/status/:jobId
 */
router.get('/status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    if (!jobId || jobId.length !== 36) {
      return res.status(400).json({
        success: false,
        error: '유효하지 않은 작업 ID입니다.'
      });
    }

    const job = await Job.findByPk(jobId, {
      attributes: [
        'id', 'status', 'progress', 'currentStage', 
        'errorMessage', 'createdAt', 'processingStartedAt', 
        'processingCompletedAt', 'metadata'
      ]
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: '해당 작업을 찾을 수 없습니다.'
      });
    }

    // 권한 확인 (작업 소유자 또는 세션)
    const userId = req.user?.id;
    const sessionId = req.sessionID;
    
    if (job.userId && job.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: '이 작업에 대한 접근 권한이 없습니다.'
      });
    }

    // 처리 시간 계산
    let processingTime = null;
    if (job.processingStartedAt && job.processingCompletedAt) {
      processingTime = Math.floor(
        (new Date(job.processingCompletedAt) - new Date(job.processingStartedAt)) / 1000
      );
    }

    res.json({
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        currentStage: job.currentStage,
        error: job.errorMessage,
        createdAt: job.createdAt,
        processingStartedAt: job.processingStartedAt,
        processingCompletedAt: job.processingCompletedAt,
        processingTime: processingTime,
        metadata: job.metadata
      }
    });

  } catch (error) {
    logger.error('Job status query error:', error);
    res.status(500).json({
      success: false,
      error: '작업 상태 조회 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 작업 결과 조회
 * GET /api/process/result/:jobId
 */
router.get('/result/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const job = await Job.findByPk(jobId, {
      include: [
        {
          model: require('../models').SourceContent,
          as: 'sourceContents'
        },
        {
          model: require('../models').Summary,
          as: 'summaries',
          include: [{
            model: SystemPrompt,
            as: 'systemPrompt',
            attributes: ['id', 'name', 'category', 'orderIndex']
          }]
        }
      ]
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: '해당 작업을 찾을 수 없습니다.'
      });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: '아직 처리가 완료되지 않았습니다.',
        status: job.status,
        progress: job.progress
      });
    }

    // 권한 확인
    const userId = req.user?.id;
    if (job.userId && job.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: '이 작업에 대한 접근 권한이 없습니다.'
      });
    }

    // 결과 구성
    const result = {
      job: {
        id: job.id,
        status: job.status,
        progress: job.progress,
        sourceUrl: job.sourceUrl,
        completedAt: job.processingCompletedAt,
        metadata: job.metadata
      },
      sourceContent: job.sourceContents.map(sc => ({
        type: sc.contentType,
        language: sc.language,
        duration: sc.duration,
        wordCount: sc.wordCount,
        metadata: sc.metadata
      })),
      summaries: job.summaries
        .sort((a, b) => a.systemPrompt.orderIndex - b.systemPrompt.orderIndex)
        .map(summary => ({
          id: summary.id,
          systemPrompt: {
            id: summary.systemPrompt.id,
            name: summary.systemPrompt.name,
            category: summary.systemPrompt.category
          },
          content: summary.content,
          status: summary.status,
          error: summary.errorMessage,
          tokensUsed: summary.tokensUsed,
          processingTime: summary.processingTime,
          aiProvider: summary.aiProvider
        }))
    };

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Job result query error:', error);
    res.status(500).json({
      success: false,
      error: '결과 조회 중 오류가 발생했습니다.'
    });
  }
});

module.exports = router;