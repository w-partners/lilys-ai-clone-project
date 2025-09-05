const express = require('express');
const router = express.Router();
const db = require('../models');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

// Admin only middleware
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }
  next();
};

// GET /api/keys - Get all API keys
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const keys = await db.ApiKey.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });

    // Mask keys for security
    const maskedKeys = keys.map(key => ({
      id: key.id,
      provider: key.provider,
      name: key.name,
      key: key.getMaskedKey(),
      fullKey: key.key, // Only send full key for admin
      isActive: key.isActive,
      usageCount: key.usageCount,
      errorCount: key.errorCount,
      lastUsedAt: key.lastUsedAt,
      lastErrorAt: key.lastErrorAt,
      createdAt: key.createdAt
    }));

    res.json({
      success: true,
      data: maskedKeys
    });
  } catch (error) {
    logger.error('Failed to fetch API keys:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch API keys'
    });
  }
});

// POST /api/keys - Add new API key
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { provider, key, name } = req.body;

    // Validate input
    if (!provider || !key) {
      return res.status(400).json({
        success: false,
        error: 'Provider and key are required'
      });
    }

    if (!['gemini', 'openai'].includes(provider)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid provider. Must be "gemini" or "openai"'
      });
    }

    // Check if key already exists
    const existingKey = await db.ApiKey.findOne({
      where: { key, provider }
    });

    if (existingKey) {
      return res.status(400).json({
        success: false,
        error: 'This API key already exists'
      });
    }

    // Create new key
    const apiKey = await db.ApiKey.create({
      provider,
      key,
      name: name || `${provider} key`,
      userId: req.user.id
    });

    res.json({
      success: true,
      data: {
        id: apiKey.id,
        provider: apiKey.provider,
        name: apiKey.name,
        key: apiKey.getMaskedKey(),
        isActive: apiKey.isActive,
        createdAt: apiKey.createdAt
      }
    });

    logger.info(`API key added for ${provider} by user ${req.user.id}`);
  } catch (error) {
    logger.error('Failed to add API key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add API key'
    });
  }
});

// PUT /api/keys/:id - Update API key
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isActive, key } = req.body;

    const apiKey = await db.ApiKey.findOne({
      where: { id, userId: req.user.id }
    });

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        error: 'API key not found'
      });
    }

    // Update fields
    if (name !== undefined) apiKey.name = name;
    if (isActive !== undefined) apiKey.isActive = isActive;
    if (key !== undefined) {
      // Check if new key already exists
      const existingKey = await db.ApiKey.findOne({
        where: { 
          key, 
          provider: apiKey.provider,
          id: { [db.Sequelize.Op.ne]: id }
        }
      });

      if (existingKey) {
        return res.status(400).json({
          success: false,
          error: 'This API key already exists'
        });
      }
      
      apiKey.key = key;
      // Reset usage stats when key changes
      apiKey.usageCount = 0;
      apiKey.errorCount = 0;
      apiKey.lastUsedAt = null;
      apiKey.lastErrorAt = null;
    }

    await apiKey.save();

    res.json({
      success: true,
      data: {
        id: apiKey.id,
        provider: apiKey.provider,
        name: apiKey.name,
        key: apiKey.getMaskedKey(),
        isActive: apiKey.isActive,
        usageCount: apiKey.usageCount,
        errorCount: apiKey.errorCount
      }
    });

    logger.info(`API key ${id} updated by user ${req.user.id}`);
  } catch (error) {
    logger.error('Failed to update API key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update API key'
    });
  }
});

// DELETE /api/keys/:id - Delete API key
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    const apiKey = await db.ApiKey.findOne({
      where: { id, userId: req.user.id }
    });

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        error: 'API key not found'
      });
    }

    await apiKey.destroy();

    res.json({
      success: true,
      message: 'API key deleted successfully'
    });

    logger.info(`API key ${id} deleted by user ${req.user.id}`);
  } catch (error) {
    logger.error('Failed to delete API key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete API key'
    });
  }
});

// POST /api/keys/test/:id - Test specific API key
router.post('/test/:id', auth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    const apiKey = await db.ApiKey.findOne({
      where: { id, userId: req.user.id }
    });

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        error: 'API key not found'
      });
    }

    // Test the key based on provider
    let testResult = { status: 'unknown', message: 'Test not implemented' };

    if (apiKey.provider === 'gemini') {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      try {
        const genAI = new GoogleGenerativeAI(apiKey.key);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent('Test connection');
        await result.response;
        testResult = { status: 'connected', message: 'Gemini API key is valid' };
        
        // Update usage stats
        apiKey.usageCount++;
        apiKey.lastUsedAt = new Date();
        await apiKey.save();
      } catch (error) {
        testResult = { status: 'error', message: error.message };
        
        // Update error stats
        apiKey.errorCount++;
        apiKey.lastErrorAt = new Date();
        await apiKey.save();
      }
    } else if (apiKey.provider === 'openai') {
      const OpenAI = require('openai');
      try {
        const openai = new OpenAI({ apiKey: apiKey.key });
        await openai.models.list();
        testResult = { status: 'connected', message: 'OpenAI API key is valid' };
        
        // Update usage stats
        apiKey.usageCount++;
        apiKey.lastUsedAt = new Date();
        await apiKey.save();
      } catch (error) {
        testResult = { status: 'error', message: error.message };
        
        // Update error stats
        apiKey.errorCount++;
        apiKey.lastErrorAt = new Date();
        await apiKey.save();
      }
    }

    res.json({
      success: true,
      data: testResult
    });
  } catch (error) {
    logger.error('Failed to test API key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test API key'
    });
  }
});

module.exports = router;