const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../models');
const logger = require('../utils/logger');

class AuthService {
  /**
   * Generate JWT token
   * @param {Object} user - User object
   * @returns {string} JWT token
   */
  generateToken(user) {
    const payload = {
      id: user.id,
      phone: user.phone,
      email: user.email,
      role: user.role
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token
   * @returns {Object} Decoded token payload
   */
  verifyToken(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
  }

  /**
   * Register new user
   * @param {Object} userData - User registration data
   * @returns {Object} Created user and token
   */
  async register(userData) {
    const { phone, email, password, name } = userData;

    try {
      // Check if user already exists
      const existingUser = await db.User.findOne({ 
        where: db.Sequelize.or(
          { phone: phone },
          email ? { email: email } : {}
        )
      });
      if (existingUser) {
        if (existingUser.phone === phone) {
          throw new Error('User with this phone number already exists');
        }
        throw new Error('User with this email already exists');
      }

      // Create new user
      const user = await db.User.create({
        phone,
        email,
        password,
        name,
        emailVerificationToken: email ? crypto.randomBytes(32).toString('hex') : null
      });

      // Generate token
      const token = this.generateToken(user);

      // TODO: Send verification email if email provided
      logger.info(`User registered: ${user.phone}`);

      return {
        user: user.toJSON(),
        token
      };
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Login user with phone number
   * @param {string} phone - User phone number
   * @param {string} password - User password
   * @returns {Object} User and token
   */
  async login(phone, password) {
    try {
      // Find user by phone
      const user = await db.User.findOne({ where: { phone } });
      if (!user) {
        throw new Error('Invalid phone number or password');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new Error('Account is deactivated');
      }

      // Verify password
      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        throw new Error('Invalid phone number or password');
      }

      // Update last login
      await user.update({ lastLoginAt: new Date() });

      // Generate token
      const token = this.generateToken(user);

      logger.info(`User logged in: ${user.phone}`);

      return {
        user: user.toJSON(),
        token
      };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @returns {Object} User object
   */
  async getUserById(userId) {
    try {
      const user = await db.User.findByPk(userId, {
        include: [
          {
            model: db.Summary,
            as: 'summaries',
            limit: 5,
            order: [['createdAt', 'DESC']],
            attributes: ['id', 'title', 'createdAt', 'inputType', 'provider']
          }
        ]
      });

      if (!user) {
        throw new Error('User not found');
      }

      return user.toJSON();
    } catch (error) {
      logger.error('Get user error:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updates - Profile updates
   * @returns {Object} Updated user
   */
  async updateProfile(userId, updates) {
    try {
      const user = await db.User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Only allow certain fields to be updated
      const allowedFields = ['name', 'email', 'avatar', 'preferences'];
      const filteredUpdates = {};
      allowedFields.forEach(field => {
        if (updates[field] !== undefined) {
          filteredUpdates[field] = updates[field];
        }
      });

      await user.update(filteredUpdates);

      logger.info(`User profile updated: ${user.email}`);

      return user.toJSON();
    } catch (error) {
      logger.error('Update profile error:', error);
      throw error;
    }
  }

  /**
   * Change user password
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {boolean} Success status
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await db.User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isValidPassword = await user.comparePassword(currentPassword);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      await user.update({ password: newPassword });

      logger.info(`Password changed for user: ${user.email}`);

      return true;
    } catch (error) {
      logger.error('Change password error:', error);
      throw error;
    }
  }

  /**
   * Request password reset
   * @param {string} email - User email
   * @returns {string} Reset token
   */
  async requestPasswordReset(email) {
    try {
      const user = await db.User.findOne({ where: { email } });
      if (!user) {
        // Don't reveal if user exists
        logger.info(`Password reset requested for non-existent email: ${email}`);
        return null;
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 3600000); // 1 hour

      await user.update({
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires
      });

      // TODO: Send reset email
      logger.info(`Password reset requested for: ${user.email}`);

      return resetToken;
    } catch (error) {
      logger.error('Request password reset error:', error);
      throw error;
    }
  }

  /**
   * Reset password with token
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @returns {boolean} Success status
   */
  async resetPassword(token, newPassword) {
    try {
      const user = await db.User.findOne({
        where: {
          resetPasswordToken: token,
          resetPasswordExpires: { [db.Sequelize.Op.gt]: new Date() }
        }
      });

      if (!user) {
        throw new Error('Invalid or expired reset token');
      }

      // Update password and clear reset token
      await user.update({
        password: newPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null
      });

      logger.info(`Password reset completed for: ${user.email}`);

      return true;
    } catch (error) {
      logger.error('Reset password error:', error);
      throw error;
    }
  }

  /**
   * Verify email with token
   * @param {string} token - Verification token
   * @returns {boolean} Success status
   */
  async verifyEmail(token) {
    try {
      const user = await db.User.findOne({
        where: { emailVerificationToken: token }
      });

      if (!user) {
        throw new Error('Invalid verification token');
      }

      await user.update({
        emailVerified: true,
        emailVerificationToken: null
      });

      logger.info(`Email verified for: ${user.email}`);

      return true;
    } catch (error) {
      logger.error('Verify email error:', error);
      throw error;
    }
  }
}

module.exports = new AuthService();