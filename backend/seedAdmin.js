#!/usr/bin/env node

/**
 * Admin Seeding Script
 * Creates an admin user for testing the admin dashboard
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

const seedAdmin = async () => {
  try {
    console.log('\n🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const adminData = {
      name: 'Admin User',
      email: 'admin@retailconnect.com',
      password: 'admin@123', // This will be hashed by the pre-save hook
      mobile: '9999999999',
      role: 'admin'
    };

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminData.email });
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists!');
      console.log('Email:', adminData.email);
      console.log('\n📝 Admin Credentials:');
      console.log('   Email: admin@retailconnect.com');
      console.log('   Password: admin@123\n');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Create admin user
    console.log('👤 Creating admin user...');
    const admin = new User(adminData);
    await admin.save();
    console.log('✅ Admin user created successfully!\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 ADMIN LOGIN CREDENTIALS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email:    admin@retailconnect.com');
    console.log('Password: admin@123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('✨ Now you can:');
    console.log('   1. Log in to the admin dashboard with these credentials');
    console.log('   2. Access all admin features and analytics\n');

    await mongoose.disconnect();
    console.log('✅ Done! Disconnected from MongoDB\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
};

seedAdmin();
