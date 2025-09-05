const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const db = require('../models');
const { Op } = require('sequelize');

// Get all system prompts
router.get('/', auth, async (req, res) => {
  try {
    const prompts = await db.SystemPrompt.findAll({
      where: req.user.role === 'admin' ? {} : { isActive: true },
      order: [['category', 'ASC'], ['orderIndex', 'ASC']],
      include: [{
        model: db.User,
        as: 'creator',
        attributes: ['id', 'name', 'phone']
      }]
    });

    res.json({
      success: true,
      data: prompts
    });
  } catch (error) {
    console.error('Error fetching system prompts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system prompts'
    });
  }
});

// Get active prompts for processing (internal use)
router.get('/active', auth, async (req, res) => {
  try {
    const prompts = await db.SystemPrompt.findAll({
      where: { isActive: true },
      order: [['category', 'ASC'], ['orderIndex', 'ASC']]
    });

    res.json({
      success: true,
      data: prompts
    });
  } catch (error) {
    console.error('Error fetching active prompts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active prompts'
    });
  }
});

// Public API: Get active prompts for public use (no auth required)
router.get('/public', async (req, res) => {
  try {
    const prompts = await db.SystemPrompt.findAll({
      where: { isActive: true },
      order: [['orderIndex', 'ASC'], ['category', 'ASC']],
      attributes: ['id', 'name', 'category', 'orderIndex'] // Only return necessary fields
    });

    res.json({
      success: true,
      data: prompts
    });
  } catch (error) {
    console.error('Error fetching public prompts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system prompts'
    });
  }
});

// Create new system prompt (admin only)
router.post('/', auth, admin, async (req, res) => {
  try {
    const { name, prompt, category, order, isActive, description } = req.body;

    if (!name || !prompt) {
      return res.status(400).json({
        success: false,
        error: 'Name and prompt are required'
      });
    }

    const systemPrompt = await db.SystemPrompt.create({
      name,
      promptText: prompt,
      category: category || 'summary',
      orderIndex: order || 0,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user.id,
      metadata: { description: description || '' }
    });

    res.status(201).json({
      success: true,
      data: systemPrompt
    });
  } catch (error) {
    console.error('Error creating system prompt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create system prompt'
    });
  }
});

// Update system prompt (admin only)
router.put('/:id', auth, admin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, prompt, category, order, isActive, description } = req.body;

    const systemPrompt = await db.SystemPrompt.findByPk(id);
    if (!systemPrompt) {
      return res.status(404).json({
        success: false,
        error: 'System prompt not found'
      });
    }

    const updateData = {
      name: name || systemPrompt.name,
      promptText: prompt || systemPrompt.promptText,
      category: category || systemPrompt.category,
      orderIndex: order !== undefined ? order : systemPrompt.orderIndex,
      isActive: isActive !== undefined ? isActive : systemPrompt.isActive
    };

    // Handle description in metadata
    if (description !== undefined) {
      updateData.metadata = { ...systemPrompt.metadata, description };
    }

    await systemPrompt.update(updateData);

    res.json({
      success: true,
      data: systemPrompt
    });
  } catch (error) {
    console.error('Error updating system prompt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update system prompt'
    });
  }
});

// Delete system prompt (admin only)
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    const { id } = req.params;

    const systemPrompt = await db.SystemPrompt.findByPk(id);
    if (!systemPrompt) {
      return res.status(404).json({
        success: false,
        error: 'System prompt not found'
      });
    }

    await systemPrompt.destroy();

    res.json({
      success: true,
      message: 'System prompt deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting system prompt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete system prompt'
    });
  }
});

// Reorder system prompts (admin only)
router.post('/reorder', auth, admin, async (req, res) => {
  try {
    const { prompts } = req.body;

    if (!Array.isArray(prompts)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid prompts array'
      });
    }

    // Update order for each prompt
    const updatePromises = prompts.map((item, index) => 
      db.SystemPrompt.update(
        { orderIndex: index },
        { where: { id: item.id } }
      )
    );

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: 'Prompts reordered successfully'
    });
  } catch (error) {
    console.error('Error reordering prompts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reorder prompts'
    });
  }
});

module.exports = router;