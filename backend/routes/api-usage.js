const express = require('express');
const router = express.Router();

// GET /api/usage/gemini - Dummy endpoint (usage tracking removed)
router.get('/gemini', async (req, res) => {
  res.json({
    service: 'gemini',
    usage: {
      requestsToday: 0,
      tokensToday: 0,
      remainingRequests: 999999,
      remainingTokens: 999999
    },
    limits: {
      requestsPerMinute: 60,
      requestsPerDay: 1500,
      tokensPerMinute: 1000000,
      freeMonthlyTokens: 1000000000
    }
  });
});

// GET /api/usage/openai - Dummy endpoint (usage tracking removed)
router.get('/openai', async (req, res) => {
  res.json({
    service: 'openai',
    usage: {
      totalUsed: 0,
      totalGranted: 100,
      remaining: 100
    },
    limits: {
      rateLimit: '3 requests per minute',
      modelLimits: {
        'gpt-3.5-turbo': '90000 tokens per minute',
        'gpt-4': '10000 tokens per minute'
      }
    }
  });
});

// GET /api/usage - Combined usage (dummy data)
router.get('/', async (req, res) => {
  res.json({
    gemini: {
      requestsToday: 0,
      tokensToday: 0,
      remainingRequests: 999999
    },
    openai: {
      totalUsed: 0,
      remaining: 100
    },
    summary: {
      totalRequests: 0,
      totalTokens: 0,
      costEstimate: '$0.00'
    }
  });
});

module.exports = router;