const express = require('express');
const jwt = require('jsonwebtoken');
const { Job, SourceContent, Summary, SystemPrompt } = require('../models');
const logger = require('../utils/logger');

const router = express.Router();

// JWT 토큰 검증 미들웨어
const authenticateToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: '로그인이 필요한 서비스입니다.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await require('../models').User.findByPk(decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: '유효하지 않은 사용자입니다.'
      });
    }

    req.user = user;
    next();

  } catch (error) {
    return res.status(401).json({
      success: false,
      error: '유효하지 않은 인증 토큰입니다.'
    });
  }
};

/**
 * 사용자 히스토리 목록 조회
 * GET /api/history
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { userId: req.user.id };
    if (status && ['pending', 'processing', 'completed', 'failed'].includes(status)) {
      whereClause.status = status;
    }

    const { count, rows } = await Job.findAndCountAll({
      where: whereClause,
      include: [{
        model: SourceContent,
        as: 'sourceContents',
        attributes: ['contentType', 'language', 'duration', 'wordCount', 'metadata']
      }],
      attributes: [
        'id', 'sourceUrl', 'status', 'progress', 'currentStage',
        'createdAt', 'processingCompletedAt', 'metadata'
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    const jobs = rows.map(job => ({
      id: job.id,
      sourceUrl: job.sourceUrl,
      status: job.status,
      progress: job.progress,
      currentStage: job.currentStage,
      createdAt: job.createdAt,
      completedAt: job.processingCompletedAt,
      videoInfo: job.sourceContents.length > 0 ? {
        title: job.sourceContents[0].metadata?.title,
        channelName: job.sourceContents[0].metadata?.channelName,
        duration: job.sourceContents[0].duration,
        language: job.sourceContents[0].language
      } : null
    }));

    res.json({
      success: true,
      data: {
        jobs: jobs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    logger.error('History query error:', error);
    res.status(500).json({
      success: false,
      error: '히스토리 조회 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 특정 작업의 상세 정보 및 결과 조회
 * GET /api/history/:jobId
 */
router.get('/:jobId', authenticateToken, async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findOne({
      where: { 
        id: jobId,
        userId: req.user.id 
      },
      include: [
        {
          model: SourceContent,
          as: 'sourceContents'
        },
        {
          model: Summary,
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

    const result = {
      job: {
        id: job.id,
        sourceUrl: job.sourceUrl,
        status: job.status,
        progress: job.progress,
        currentStage: job.currentStage,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt,
        processingStartedAt: job.processingStartedAt,
        processingCompletedAt: job.processingCompletedAt,
        metadata: job.metadata
      },
      sourceContent: job.sourceContents.map(sc => ({
        id: sc.id,
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
          aiProvider: summary.aiProvider,
          createdAt: summary.createdAt
        }))
    };

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('History detail query error:', error);
    res.status(500).json({
      success: false,
      error: '작업 상세 정보 조회 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 작업 삭제
 * DELETE /api/history/:jobId
 */
router.delete('/:jobId', authenticateToken, async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findOne({
      where: { 
        id: jobId,
        userId: req.user.id 
      }
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: '해당 작업을 찾을 수 없습니다.'
      });
    }

    // 진행 중인 작업은 삭제 불가
    if (job.status === 'processing') {
      return res.status(400).json({
        success: false,
        error: '진행 중인 작업은 삭제할 수 없습니다.'
      });
    }

    await job.destroy();

    logger.info(`Job deleted: ${jobId} by user ${req.user.id}`);

    res.json({
      success: true,
      message: '작업이 삭제되었습니다.'
    });

  } catch (error) {
    logger.error('History delete error:', error);
    res.status(500).json({
      success: false,
      error: '작업 삭제 중 오류가 발생했습니다.'
    });
  }
});

module.exports = router;