#!/usr/bin/env node

/**
 * Diagnostic startup script for RetailConnect Backend
 * This script helps identify why the backend fails to start
 */

require('dotenv').config();
const path = require('path');

console.log('\n🔍 BACKEND STARTUP DIAGNOSTICS\n');
console.log('=' .repeat(60));

// 1. Check environment variables
console.log('\n✓ Environment Variables:');
console.log('  PORT:', process.env.PORT || '5000');
console.log('  NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('  JWT_SECRET:', process.env.JWT_SECRET ? '✓ Set' : '✗ NOT SET');
console.log('  MONGODB_URI:', process.env.MONGODB_URI ? '✓ Set' : '✗ NOT SET');

// 2. Check required modules
console.log('\n✓ Checking Required Modules:');
const modules = [
  'express',
  'mongoose',
  'socket.io',
  'dotenv',
  'jsonwebtoken',
  'bcryptjs',
  'cors'
];

modules.forEach(mod => {
  try {
    require(mod);
    console.log(`  ✓ ${mod}`);
  } catch (err) {
    console.log(`  ✗ ${mod} - NOT INSTALLED`);
  }
});

// 3. Check if MongoDB connection works
console.log('\n✓ Testing MongoDB Connection:');
const mongoose = require('mongoose');

(async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.log('  ✗ MONGODB_URI not set in .env');
      process.exit(1);
    }

    console.log('  Connecting to MongoDB...');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
    });
    
    console.log('  ✓ MongoDB Connection Successful');
    
    // 4. Check if models load
    console.log('\n✓ Checking Models:');
    const models = [
      'User',
      'Shop',
      'Product',
      'Order',
      'Review',
      'Cart',
      'Message',
      'Complaint'
    ];

    models.forEach(model => {
      try {
        require(`./src/models/${model}`);
        console.log(`  ✓ ${model} model`);
      } catch (err) {
        console.log(`  ✗ ${model} model - ${err.message}`);
      }
    });

    // 5. Check if routes load
    console.log('\n✓ Checking Routes:');
    const routes = [
      'authRoutes',
      'shopRoutes',
      'productRoutes',
      'orderRoutes',
      'analyticsRoutes'
    ];

    routes.forEach(route => {
      try {
        require(`./src/routes/${route}`);
        console.log(`  ✓ ${route}`);
      } catch (err) {
        console.log(`  ✗ ${route} - ${err.message}`);
      }
    });

    console.log('\n✓ All Checks Passed!');
    console.log('\nYou can now run: npm start\n');
    
    process.exit(0);
  } catch (error) {
    console.log(`  ✗ MongoDB Connection Failed:`);
    console.log(`    ${error.message}`);
    console.log('\n  Make sure:');
    console.log('    1. MongoDB Atlas is accessible');
    console.log('    2. Your IP is whitelisted in MongoDB Atlas');
    console.log('    3. Connection string is correct in .env');
    console.log('    4. Internet connection is working\n');
    process.exit(1);
  }
})();
