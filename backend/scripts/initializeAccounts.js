require('dotenv').config();
const db = require('../models');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

const DEFAULT_ACCOUNTS = [
  {
    phone: '01034424668',
    password: 'admin1234',
    name: '관리자',
    role: 'admin',
    email: 'admin@lilys.ai',
    isActive: true,
    emailVerified: true,
    geminiApiKey: 'AIzaSyBhXb6o6nxY2Neo38qZzUsC7ReQPic1kRY',
    openaiApiKey: null // 추후 설정
  },
  {
    phone: '01012345678', 
    password: 'admin1234',
    name: '운영자',
    role: 'operator',
    email: 'operator@lilys.ai',
    isActive: true,
    emailVerified: true,
    geminiApiKey: null,
    openaiApiKey: null
  }
];

async function initializeAccounts() {
  try {
    await db.sequelize.authenticate();
    logger.info('Database connection established');

    // Skip sync - use migrations instead
    // await db.sequelize.sync({ alter: true });
    // logger.info('Database synchronized');

    // Create default accounts
    for (const account of DEFAULT_ACCOUNTS) {
      const existingUser = await db.User.findOne({ 
        where: { phone: account.phone } 
      });

      if (!existingUser) {
        // Hash password
        const hashedPassword = await bcrypt.hash(account.password, 10);
        
        await db.User.create({
          ...account,
          password: hashedPassword
        });
        
        logger.info(`Created ${account.role} account: ${account.phone}`);
      } else {
        logger.info(`${account.role} account already exists: ${account.phone}`);
      }
    }

    logger.info('Account initialization completed');
    // Don't exit when called from server.js
    if (require.main === module) {
      process.exit(0);
    }
  } catch (error) {
    logger.error('Failed to initialize accounts:', error);
    if (require.main === module) {
      process.exit(1);
    }
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  initializeAccounts();
}

module.exports = initializeAccounts;