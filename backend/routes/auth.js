const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * 전화번호로 로그인
 * POST /api/auth/login
 */
router.post('/login', [
  body('phoneNumber')
    .matches(/^01[0-9]{8,9}$/)
    .withMessage('올바른 전화번호 형식을 입력해주세요. (01012345678)'),
  body('password')
    .isLength({ min: 4, max: 20 })
    .withMessage('비밀번호는 4-20자 사이여야 합니다.')
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

    const { phoneNumber, password } = req.body;

    // 사용자 조회
    const user = await User.findOne({ 
      where: { 
        phoneNumber: phoneNumber,
        isActive: true 
      }
    });

    if (!user || !await user.validatePassword(password)) {
      return res.status(401).json({
        success: false,
        error: '전화번호 또는 비밀번호가 올바르지 않습니다.'
      });
    }

    // 로그인 시간 업데이트
    await user.update({ lastLoginAt: new Date() });

    // JWT 토큰 생성
    const token = jwt.sign(
      { 
        userId: user.id,
        phoneNumber: user.phoneNumber,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    logger.info(`User logged in: ${user.phoneNumber}`);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          phoneNumber: user.phoneNumber,
          role: user.role,
          lastLoginAt: user.lastLoginAt
        },
        token: token
      }
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: '로그인 처리 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 토큰 검증
 * GET /api/auth/me
 */
router.get('/me', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: '인증 토큰이 필요합니다.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId, {
      attributes: ['id', 'phoneNumber', 'role', 'isActive', 'lastLoginAt']
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: '유효하지 않은 사용자입니다.'
      });
    }

    res.json({
      success: true,
      data: {
        user: user
      }
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: '유효하지 않은 토큰입니다.'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: '만료된 토큰입니다. 다시 로그인해주세요.'
      });
    }

    logger.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      error: '토큰 검증 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 로그아웃
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  // JWT는 stateless이므로 서버에서 특별한 처리 불요
  // 클라이언트에서 토큰 삭제
  res.json({
    success: true,
    message: '로그아웃되었습니다.'
  });
});

module.exports = router;