#!/usr/bin/env node
require('dotenv').config();
const db = require('../models');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

async function resetAccounts() {
  try {
    // Connect to database
    await db.sequelize.authenticate();
    console.log('Database connected');

    // Delete existing accounts
    await db.User.destroy({
      where: {
        phone: ['01034424668', '01012345678']
      }
    });
    console.log('Existing accounts deleted');

    // Create admin account
    // Note: User model has beforeCreate hook that hashes the password
    const admin = await db.User.create({
      phone: '01034424668',
      password: 'admin1234',  // Plain password - will be hashed by model hook
      name: '관리자',
      role: 'admin',
      email: 'admin@lilys.ai',
      isActive: true,
      emailVerified: true,
      preferences: JSON.stringify({
        language: 'ko',
        theme: 'light',
        notifications: {
          email: true,
          push: true,
          sms: false
        }
      })
    });
    console.log('Admin account created:', admin.phone);

    // Create operator account  
    const operator = await db.User.create({
      phone: '01012345678',
      password: 'admin1234',  // Plain password - will be hashed by model hook
      name: '운영자',
      role: 'operator',
      email: 'operator@lilys.ai',
      isActive: true,
      emailVerified: true,
      preferences: JSON.stringify({
        language: 'ko',
        theme: 'light',
        notifications: {
          email: true,
          push: true,
          sms: false
        }
      })
    });
    console.log('Operator account created:', operator.phone);

    // Test login
    const testUser = await db.User.findOne({ where: { phone: '01034424668' } });
    if (testUser) {
      const isValid = await bcrypt.compare('admin1234', testUser.password);
      console.log('Password verification test:', isValid ? 'PASSED' : 'FAILED');
      console.log('Password hash:', testUser.password);
      
      // Test with User model method
      const isValidMethod = await testUser.comparePassword('admin1234');
      console.log('Model method test:', isValidMethod ? 'PASSED' : 'FAILED');
    }

    console.log('\n✅ Accounts reset successfully!');
    console.log('=====================================');
    console.log('Admin: 01034424668 / admin1234');
    console.log('Operator: 01012345678 / admin1234');
    console.log('=====================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error resetting accounts:', error);
    process.exit(1);
  }
}

resetAccounts();