const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { User, SystemPrompt } = require('../models');
const logger = require('../utils/logger');

const router = express.Router();

// 관리자 인증 미들웨어
const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: '관리자 인증이 필요합니다.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId);
    
    if (!user || !user.isActive || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '관리자 권한이 필요합니다.'
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
 * 모든 시스템 프롬프트 조회 (관리자용)
 * GET /api/admin/system-prompts
 */
router.get('/system-prompts', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, category, isActive } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (category) whereClause.category = category;
    if (isActive !== undefined) whereClause.isActive = isActive === 'true';

    const { count, rows } = await SystemPrompt.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'phoneNumber', 'role']
      }],
      order: [['orderIndex', 'ASC'], ['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    res.json({
      success: true,
      data: {
        prompts: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Admin system prompts query error:', error);
    res.status(500).json({
      success: false,
      error: '시스템 프롬프트 조회 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 시스템 프롬프트 생성
 * POST /api/admin/system-prompts
 */
router.post('/system-prompts', authenticateAdmin, [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('이름은 1-100자 사이여야 합니다.'),
  body('prompt')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('프롬프트는 10-5000자 사이여야 합니다.'),
  body('category')
    .isIn(['general', 'summary', 'analysis', 'quiz', 'translation', 'custom'])
    .withMessage('유효하지 않은 카테고리입니다.'),
  body('orderIndex')
    .optional()
    .isInt({ min: 0, max: 999 })
    .withMessage('순서는 0-999 사이의 숫자여야 합니다.')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: '입력 정보가 올바르지 않습니다.',
        details: errors.array()
      });
    }

    const { name, prompt, category, orderIndex = 0, isActive = true } = req.body;

    // 이름 중복 확인
    const existingPrompt = await SystemPrompt.findOne({
      where: { name: name }
    });

    if (existingPrompt) {
      return res.status(400).json({
        success: false,
        error: '이미 존재하는 프롬프트 이름입니다.'
      });
    }

    const systemPrompt = await SystemPrompt.create({
      name,
      prompt,
      category,
      orderIndex,
      isActive,
      createdBy: req.user.id
    });

    logger.info(`System prompt created: ${systemPrompt.id} by admin ${req.user.id}`);

    res.status(201).json({
      success: true,
      data: systemPrompt,
      message: '시스템 프롬프트가 생성되었습니다.'
    });

  } catch (error) {
    logger.error('System prompt creation error:', error);
    res.status(500).json({
      success: false,
      error: '시스템 프롬프트 생성 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 시스템 프롬프트 수정
 * PUT /api/admin/system-prompts/:id
 */
router.put('/system-prompts/:id', authenticateAdmin, [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('이름은 1-100자 사이여야 합니다.'),
  body('prompt')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('프롬프트는 10-5000자 사이여야 합니다.'),
  body('category')
    .isIn(['general', 'summary', 'analysis', 'quiz', 'translation', 'custom'])
    .withMessage('유효하지 않은 카테고리입니다.'),
  body('orderIndex')
    .optional()
    .isInt({ min: 0, max: 999 })
    .withMessage('순서는 0-999 사이의 숫자여야 합니다.')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: '입력 정보가 올바르지 않습니다.',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { name, prompt, category, orderIndex, isActive } = req.body;

    const systemPrompt = await SystemPrompt.findByPk(id);
    if (!systemPrompt) {
      return res.status(404).json({
        success: false,
        error: '해당 시스템 프롬프트를 찾을 수 없습니다.'
      });
    }

    // 이름 중복 확인 (자신 제외)
    const existingPrompt = await SystemPrompt.findOne({
      where: { 
        name: name,
        id: { [require('sequelize').Op.ne]: id }
      }
    });

    if (existingPrompt) {
      return res.status(400).json({
        success: false,
        error: '이미 존재하는 프롬프트 이름입니다.'
      });
    }

    await systemPrompt.update({
      name,
      prompt,
      category,
      orderIndex,
      isActive
    });

    logger.info(`System prompt updated: ${id} by admin ${req.user.id}`);

    res.json({
      success: true,
      data: systemPrompt,
      message: '시스템 프롬프트가 수정되었습니다.'
    });

  } catch (error) {
    logger.error('System prompt update error:', error);
    res.status(500).json({
      success: false,
      error: '시스템 프롬프트 수정 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 시스템 프롬프트 삭제
 * DELETE /api/admin/system-prompts/:id
 */
router.delete('/system-prompts/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const systemPrompt = await SystemPrompt.findByPk(id);
    if (!systemPrompt) {
      return res.status(404).json({
        success: false,
        error: '해당 시스템 프롬프트를 찾을 수 없습니다.'
      });
    }

    // 사용 중인 프롬프트인지 확인
    const { Summary } = require('../models');
    const usageCount = await Summary.count({
      where: { systemPromptId: id }
    });

    if (usageCount > 0) {
      return res.status(400).json({
        success: false,
        error: '이미 사용된 시스템 프롬프트는 삭제할 수 없습니다. 비활성화를 권장합니다.'
      });
    }

    await systemPrompt.destroy();

    logger.info(`System prompt deleted: ${id} by admin ${req.user.id}`);

    res.json({
      success: true,
      message: '시스템 프롬프트가 삭제되었습니다.'
    });

  } catch (error) {
    logger.error('System prompt deletion error:', error);
    res.status(500).json({
      success: false,
      error: '시스템 프롬프트 삭제 중 오류가 발생했습니다.'
    });
  }
});

module.exports = router;