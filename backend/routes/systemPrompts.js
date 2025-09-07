const express = require('express');
const jwt = require('jsonwebtoken');
const { SystemPrompt, User } = require('../models');
const logger = require('../utils/logger');

const router = express.Router();

// JWT 토큰 검증 및 관리자 권한 확인 미들웨어
const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: '로그인이 필요한 서비스입니다.'
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
 * 활성 시스템 프롬프트 목록 조회 (공개)
 * GET /api/system-prompts
 */
router.get('/', async (req, res) => {
  try {
    const prompts = await SystemPrompt.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'category', 'orderIndex'],
      order: [['orderIndex', 'ASC']]
    });

    res.json({
      success: true,
      data: prompts
    });

  } catch (error) {
    logger.error('System prompts query error:', error);
    res.status(500).json({
      success: false,
      error: '시스템 프롬프트 조회 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 카테고리별 시스템 프롬프트 조회 (공개)
 * GET /api/system-prompts/category/:category
 */
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    const validCategories = ['general', 'summary', 'analysis', 'quiz', 'translation', 'custom'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: '유효하지 않은 카테고리입니다.'
      });
    }

    const prompts = await SystemPrompt.findAll({
      where: { 
        category: category,
        isActive: true 
      },
      attributes: ['id', 'name', 'category', 'orderIndex'],
      order: [['orderIndex', 'ASC']]
    });

    res.json({
      success: true,
      data: prompts
    });

  } catch (error) {
    logger.error('System prompts by category query error:', error);
    res.status(500).json({
      success: false,
      error: '카테고리별 시스템 프롬프트 조회 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 시스템 프롬프트 상세 조회 (공개)
 * GET /api/system-prompts/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || id.length !== 36) {
      return res.status(400).json({
        success: false,
        error: '유효하지 않은 ID입니다.'
      });
    }

    const prompt = await SystemPrompt.findOne({
      where: { 
        id: id,
        isActive: true 
      },
      attributes: ['id', 'name', 'prompt', 'category', 'orderIndex']
    });

    if (!prompt) {
      return res.status(404).json({
        success: false,
        error: '해당 시스템 프롬프트를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: prompt
    });

  } catch (error) {
    logger.error('System prompt detail query error:', error);
    res.status(500).json({
      success: false,
      error: '시스템 프롬프트 상세 조회 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 시스템 프롬프트 생성 (관리자 전용)
 * POST /api/system-prompts
 */
router.post('/', authenticateAdmin, async (req, res) => {
  try {
    const { name, content, category = 'general', orderIndex = 0 } = req.body;

    if (!name || !content) {
      return res.status(400).json({
        success: false,
        error: '이름과 내용은 필수 입력 항목입니다.'
      });
    }

    if (name.length > 100) {
      return res.status(400).json({
        success: false,
        error: '이름은 100자를 초과할 수 없습니다.'
      });
    }

    const prompt = await SystemPrompt.create({
      name,
      prompt: content,
      category,
      orderIndex: parseInt(orderIndex) || 0,
      createdBy: req.user.id,
      isActive: true
    });

    logger.info(`System prompt created: ${prompt.id} by user ${req.user.id}`);

    res.status(201).json({
      success: true,
      data: {
        id: prompt.id,
        name: prompt.name,
        content: prompt.prompt,
        category: prompt.category,
        orderIndex: prompt.orderIndex,
        isActive: prompt.isActive
      }
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
 * 시스템 프롬프트 수정 (관리자 전용)
 * PUT /api/system-prompts/:id
 */
router.put('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, content, category, orderIndex, isActive } = req.body;

    if (!id || id.length !== 36) {
      return res.status(400).json({
        success: false,
        error: '유효하지 않은 ID입니다.'
      });
    }

    const prompt = await SystemPrompt.findByPk(id);

    if (!prompt) {
      return res.status(404).json({
        success: false,
        error: '해당 시스템 프롬프트를 찾을 수 없습니다.'
      });
    }

    const updateData = {};
    if (name !== undefined) {
      if (!name || name.length > 100) {
        return res.status(400).json({
          success: false,
          error: '유효한 이름을 입력해주세요.'
        });
      }
      updateData.name = name;
    }
    if (content !== undefined) {
      if (!content) {
        return res.status(400).json({
          success: false,
          error: '내용을 입력해주세요.'
        });
      }
      updateData.prompt = content;
    }
    if (category !== undefined) updateData.category = category;
    if (orderIndex !== undefined) updateData.orderIndex = parseInt(orderIndex);
    if (isActive !== undefined) updateData.isActive = isActive;

    await prompt.update(updateData);

    logger.info(`System prompt updated: ${id} by user ${req.user.id}`);

    res.json({
      success: true,
      data: {
        id: prompt.id,
        name: prompt.name,
        content: prompt.prompt,
        category: prompt.category,
        orderIndex: prompt.orderIndex,
        isActive: prompt.isActive
      }
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
 * 시스템 프롬프트 삭제 (관리자 전용)
 * DELETE /api/system-prompts/:id
 */
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || id.length !== 36) {
      return res.status(400).json({
        success: false,
        error: '유효하지 않은 ID입니다.'
      });
    }

    const prompt = await SystemPrompt.findByPk(id);

    if (!prompt) {
      return res.status(404).json({
        success: false,
        error: '해당 시스템 프롬프트를 찾을 수 없습니다.'
      });
    }

    await prompt.destroy();

    logger.info(`System prompt deleted: ${id} by user ${req.user.id}`);

    res.json({
      success: true,
      message: '시스템 프롬프트가 삭제되었습니다.'
    });

  } catch (error) {
    logger.error('System prompt delete error:', error);
    res.status(500).json({
      success: false,
      error: '시스템 프롬프트 삭제 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 모든 시스템 프롬프트 목록 조회 (관리자 전용)
 * GET /api/system-prompts/admin/all
 */
router.get('/admin/all', authenticateAdmin, async (req, res) => {
  try {
    const prompts = await SystemPrompt.findAll({
      attributes: ['id', 'name', 'prompt', 'category', 'orderIndex', 'isActive', 'createdAt', 'updatedAt'],
      order: [['orderIndex', 'ASC'], ['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        prompts: prompts.map(prompt => ({
          id: prompt.id,
          name: prompt.name,
          content: prompt.prompt,
          category: prompt.category,
          orderIndex: prompt.orderIndex,
          isActive: prompt.isActive,
          createdAt: prompt.createdAt,
          updatedAt: prompt.updatedAt
        }))
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

module.exports = router;