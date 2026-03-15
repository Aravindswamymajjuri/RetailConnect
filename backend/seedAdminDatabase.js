#!/usr/bin/env node

/**
 * Admin Database Seeding Script
 * Seeds admin users and admin-related data
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

const seedAdminDatabase = async () => {
  try {
    console.log('\n🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Admin users to seed
    const adminUsers = [
      {
        name: 'Admin User',
        email: 'admin@retailconnect.com',
        password: 'admin@123',
        mobile: '9999999999',
        role: 'admin'
      },
      {
        name: 'System Administrator',
        email: 'superadmin@retailconnect.com',
        password: 'superadmin@123',
        mobile: '9999999998',
        role: 'admin'
      },
      {
        name: 'Admin Manager',
        email: 'manager@retailconnect.com',
        password: 'manager@123',
        mobile: '9999999997',
        role: 'admin'
      }
    ];

    console.log('👤 Seeding Admin Users...\n');

    let createdCount = 0;
    let skippedCount = 0;

    for (const adminData of adminUsers) {
      // Check if admin already exists
      const existingAdmin = await User.findOne({ email: adminData.email });
      
      if (existingAdmin) {
        console.log(`⏭️  Skipped: ${adminData.email} (already exists)`);
        skippedCount++;
        continue;
      }

      // Create admin user
      const admin = new User(adminData);
      await admin.save();
      console.log(`✅ Created: ${adminData.email}`);
      createdCount++;
    }

    console.log('\n' + '━'.repeat(60));
    console.log('📊 SEEDING SUMMARY');
    console.log('━'.repeat(60));
    console.log(`✅ Created: ${createdCount} admin user(s)`);
    console.log(`⏭️  Skipped: ${skippedCount} admin user(s)\n`);

    console.log('📝 ADMIN LOGIN CREDENTIALS\n');
    console.log('━'.repeat(60));
    
    adminUsers.forEach((admin) => {
      console.log(`\n👤 ${admin.name}`);
      console.log(`   Email:    ${admin.email}`);
      console.log(`   Password: ${admin.password}`);
      console.log(`   Mobile:   ${admin.mobile}`);
    });

    console.log('\n' + '━'.repeat(60));
    console.log('✨ Admin Database Seeding Complete!\n');

    console.log('🚀 Next Steps:');
    console.log('   1. Start the backend:    npm start');
    console.log('   2. Start the frontend:   npm start');
    console.log('   3. Go to login page:     http://localhost:3000/login');
    console.log('   4. Use any admin credentials above to login');
    console.log('   5. Access Admin Dashboard\n');

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
};

seedAdminDatabase();
