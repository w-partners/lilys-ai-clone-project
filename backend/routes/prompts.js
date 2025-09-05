const express = require('express');
const { body, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const db = require('../models');
const logger = require('../utils/logger');

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }
  next();
};

// Get all active system prompts (public)
router.get('/', async (req, res) => {
  try {
    const prompts = await db.SystemPrompt.findAll({
      where: { isActive: true },
      order: [['category', 'ASC'], ['order', 'ASC']],
      attributes: ['id', 'name', 'prompt', 'category', 'order']
    });

    res.json({
      success: true,
      data: prompts
    });
  } catch (error) {
    logger.error('Error fetching prompts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch prompts'
    });
  }
});

// Get all prompts (admin only)
router.get('/all', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const prompts = await db.SystemPrompt.findAll({
      order: [['category', 'ASC'], ['order', 'ASC']],
      include: [{
        model: db.User,
        as: 'creator',
        attributes: ['name', 'phone']
      }]
    });

    res.json({
      success: true,
      data: prompts
    });
  } catch (error) {
    logger.error('Error fetching all prompts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch prompts'
    });
  }
});

// Create new prompt (admin only)
router.post('/', [
  authMiddleware,
  adminMiddleware,
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('prompt').trim().notEmpty(),
  body('category').isIn(['summary', 'transcript', 'analysis', 'keypoints', 'action_items', 'sentiment', 'translation', 'custom']),
  body('order').optional().isInt({ min: 0 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { name, prompt, category, order = 0 } = req.body;

    const newPrompt = await db.SystemPrompt.create({
      name,
      prompt,
      category,
      order,
      createdBy: req.user.id,
      isActive: true
    });

    res.status(201).json({
      success: true,
      data: newPrompt
    });
  } catch (error) {
    logger.error('Error creating prompt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create prompt'
    });
  }
});

// Update prompt (admin only)
router.put('/:id', [
  authMiddleware,
  adminMiddleware,
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('prompt').optional().trim().notEmpty(),
  body('category').optional().isIn(['summary', 'analysis', 'keypoints', 'action_items', 'sentiment', 'custom']),
  body('order').optional().isInt({ min: 0 }),
  body('isActive').optional().isBoolean(),
  handleValidationErrors
], async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const prompt = await db.SystemPrompt.findByPk(id);
    if (!prompt) {
      return res.status(404).json({
        success: false,
        error: 'Prompt not found'
      });
    }

    await prompt.update(updates);

    res.json({
      success: true,
      data: prompt
    });
  } catch (error) {
    logger.error('Error updating prompt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update prompt'
    });
  }
});

// Delete prompt (admin only)
router.delete('/:id', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const { id } = req.params;

    const prompt = await db.SystemPrompt.findByPk(id);
    if (!prompt) {
      return res.status(404).json({
        success: false,
        error: 'Prompt not found'
      });
    }

    await prompt.destroy();

    res.json({
      success: true,
      message: 'Prompt deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting prompt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete prompt'
    });
  }
});

// Initialize default prompts (admin only)
router.post('/initialize', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const defaultPrompts = [
      {
        name: '핵심 요약',
        prompt: '다음 콘텐츠를 한국어로 핵심 내용만 간단명료하게 요약해주세요. 중요한 정보와 주요 논점을 중심으로 3-5개의 문단으로 정리해주세요.',
        category: 'summary',
        order: 1
      },
      {
        name: '상세 분석',
        prompt: '다음 콘텐츠를 한국어로 심층 분석해주세요. 주제, 논점, 근거, 결론을 체계적으로 정리하고, 내용의 강점과 약점을 평가해주세요.',
        category: 'analysis',
        order: 2
      },
      {
        name: '핵심 포인트',
        prompt: '다음 콘텐츠에서 가장 중요한 핵심 포인트를 한국어로 번호를 매겨 리스트 형태로 정리해주세요. 각 포인트는 한 문장으로 명확하게 표현해주세요.',
        category: 'keypoints',
        order: 3
      },
      {
        name: '실행 항목',
        prompt: '다음 콘텐츠를 바탕으로 실행 가능한 구체적인 행동 항목들을 한국어로 도출해주세요. 우선순위와 함께 실천 가능한 단계별 계획을 제시해주세요.',
        category: 'action_items',
        order: 4
      },
      {
        name: '감정 분석',
        prompt: '다음 콘텐츠의 감정적 톤과 분위기를 한국어로 분석해주세요. 긍정적/부정적/중립적 요소를 파악하고, 전달하고자 하는 감정적 메시지를 해석해주세요.',
        category: 'sentiment',
        order: 5
      },
      {
        name: '학습 포인트',
        prompt: '다음 콘텐츠에서 배울 수 있는 주요 학습 포인트를 한국어로 정리해주세요. 각 포인트에 대해 왜 중요한지, 어떻게 활용할 수 있는지 설명해주세요.',
        category: 'custom',
        order: 6
      }
    ];

    const createdPrompts = [];
    for (const promptData of defaultPrompts) {
      const [prompt, created] = await db.SystemPrompt.findOrCreate({
        where: { name: promptData.name },
        defaults: {
          ...promptData,
          createdBy: req.user.id,
          isActive: true
        }
      });
      if (created) {
        createdPrompts.push(prompt);
      }
    }

    res.json({
      success: true,
      message: `${createdPrompts.length} default prompts created`,
      data: createdPrompts
    });
  } catch (error) {
    logger.error('Error initializing prompts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize prompts'
    });
  }
});

module.exports = router;