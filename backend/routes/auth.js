const express = require('express');
const { body, validationResult } = require('express-validator');
const authService = require('../services/AuthService');
const authMiddleware = require('../middleware/auth');
const logger = require('../utils/logger');
const db = require('../models');

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

// Register new user
router.post('/register', [
  body('phone').matches(/^01[0-9]{8,9}$/).withMessage('Invalid Korean phone number format'),
  body('email').optional().isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { phone, email, password, name } = req.body;
    
    const result = await authService.register({ phone, email, password, name });
    
    res.status(201).json({
      success: true,
      data: {
        user: result.user,
        token: result.token
      }
    });
  } catch (error) {
    logger.error('Registration endpoint error:', error);
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
});

// Login user
router.post('/login', [
  body('phone').matches(/^01[0-9]{8,9}$/).withMessage('Invalid Korean phone number format'),
  body('password').notEmpty(),
  handleValidationErrors
], async (req, res) => {
  try {
    const { phone, password } = req.body;
    
    const result = await authService.login(phone, password);
    
    res.json({
      success: true,
      data: {
        user: result.user,
        token: result.token
      }
    });
  } catch (error) {
    logger.error('Login endpoint error:', error);
    
    if (error.message.includes('Invalid') || error.message.includes('deactivated')) {
      return res.status(401).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await authService.getUserById(req.user.id);
    
    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    logger.error('Get current user error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user data'
    });
  }
});

// Update profile
router.put('/profile', [
  authMiddleware,
  body('name').optional().trim().isLength({ min: 2 }),
  body('avatar').optional().isURL(),
  body('preferences').optional().isObject(),
  handleValidationErrors
], async (req, res) => {
  try {
    const updates = req.body;
    const user = await authService.updateProfile(req.user.id, updates);
    
    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

// Update profile (alias for compatibility)
router.put('/update-profile', [
  authMiddleware,
  body('name').optional().trim().isLength({ min: 2 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('avatar').optional().isURL(),
  body('preferences').optional().isObject(),
  handleValidationErrors
], async (req, res) => {
  try {
    const { name, email, avatar, preferences } = req.body;
    const updates = {};
    
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (avatar !== undefined) updates.avatar = avatar;
    if (preferences !== undefined) updates.preferences = preferences;
    
    const user = await authService.updateProfile(req.user.id, updates);
    
    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

// Change password
router.post('/change-password', [
  authMiddleware,
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    await authService.changePassword(req.user.id, currentPassword, newPassword);
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Change password error:', error);
    
    if (error.message.includes('incorrect')) {
      return res.status(401).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to change password'
    });
  }
});

// Request password reset
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail(),
  handleValidationErrors
], async (req, res) => {
  try {
    const { email } = req.body;
    
    await authService.requestPasswordReset(email);
    
    // Always return success to prevent email enumeration
    res.json({
      success: true,
      message: 'If the email exists, a reset link has been sent'
    });
  } catch (error) {
    logger.error('Forgot password error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to process request'
    });
  }
});

// Reset password with token
router.post('/reset-password', [
  body('token').notEmpty(),
  body('password').isLength({ min: 6 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { token, password } = req.body;
    
    await authService.resetPassword(token, password);
    
    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    logger.error('Reset password error:', error);
    
    if (error.message.includes('Invalid')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to reset password'
    });
  }
});

// Verify email
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    await authService.verifyEmail(token);
    
    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    logger.error('Verify email error:', error);
    
    if (error.message.includes('Invalid')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to verify email'
    });
  }
});

// Logout (client-side token removal)
router.post('/logout', authMiddleware, (req, res) => {
  // In a JWT-based system, logout is typically handled client-side
  // Here we can add any server-side cleanup if needed
  logger.info(`User logged out: ${req.user.phone || req.user.email}`);
  
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Update API keys
router.put('/api-keys', [
  authMiddleware,
  body('geminiApiKey').optional().isString(),
  body('openaiApiKey').optional().isString(),
  handleValidationErrors
], async (req, res) => {
  try {
    const { geminiApiKey, openaiApiKey } = req.body;
    
    const user = await db.User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Update API keys if provided
    const updates = {};
    if (geminiApiKey !== undefined) {
      updates.geminiApiKey = geminiApiKey || null;
    }
    if (openaiApiKey !== undefined) {
      updates.openaiApiKey = openaiApiKey || null;
    }
    
    await user.update(updates);
    
    logger.info(`API keys updated for user: ${user.phone}`);
    
    res.json({
      success: true,
      message: 'API keys updated successfully',
      data: {
        hasGeminiKey: !!user.geminiApiKey,
        hasOpenaiKey: !!user.openaiApiKey
      }
    });
  } catch (error) {
    logger.error('Update API keys error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update API keys'
    });
  }
});

// Get API keys status
router.get('/api-keys', authMiddleware, async (req, res) => {
  try {
    const user = await db.User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        hasGeminiKey: !!user.geminiApiKey,
        hasOpenaiKey: !!user.openaiApiKey,
        // Return masked keys for security
        geminiApiKey: user.geminiApiKey ? `${user.geminiApiKey.substring(0, 10)}...` : null,
        openaiApiKey: user.openaiApiKey ? `sk-...${user.openaiApiKey.slice(-4)}` : null
      }
    });
  } catch (error) {
    logger.error('Get API keys error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get API keys'
    });
  }
});

// Update user preferences
router.put('/preferences', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { emailNotifications, autoSave, language } = req.body;
    
    // Update user preferences in the database
    const user = await db.User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Update preferences (store as JSON object)
    user.preferences = {
      emailNotifications: emailNotifications !== undefined ? emailNotifications : user.preferences?.emailNotifications,
      autoSave: autoSave !== undefined ? autoSave : user.preferences?.autoSave,
      language: language || user.preferences?.language || 'ko'
    };
    
    await user.save();
    
    logger.info('Updated preferences for user:', userId, user.preferences);
    
    res.json({
      success: true,
      data: user.preferences
    });
  } catch (error) {
    logger.error('Failed to update preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update preferences'
    });
  }
});

module.exports = router;