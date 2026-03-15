#!/usr/bin/env node

/**
 * Fix Geospatial Index Script
 * Ensures the shops collection has the proper 2dsphere index for location queries
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Shop = require('./src/models/Shop');

const fixGeospatialIndex = async () => {
  try {
    console.log('\n🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check if shops exist
    console.log('📊 Checking shops in database...');
    const shopCount = await Shop.countDocuments();
    console.log(`Found ${shopCount} shops\n`);

    if (shopCount === 0) {
      console.log('⚠️  No shops found! Run seedShops.js first.\n');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Drop and recreate the geospatial index
    console.log('🔧 Rebuilding geospatial index...');
    await Shop.collection.dropIndexes();
    console.log('✅ Dropped old indexes');

    // The model definition should recreate indexes, so we'll call ensureIndexes
    await Shop.collection.ensureIndexes();
    console.log('✅ Created new indexes');

    // Manually ensure the 2dsphere index exists
    await Shop.collection.createIndex({ location: '2dsphere' });
    console.log('✅ 2dsphere index created successfully\n');

    // List all indexes
    console.log('📋 Current indexes on shops collection:');
    const indexes = await Shop.collection.getIndexes();
    Object.entries(indexes).forEach(([name, spec]) => {
      console.log(`   - ${name}:`, JSON.stringify(spec));
    });

    // Test a sample shop's location data
    console.log('\n🧪 Verifying shop location data...');
    const sampleShop = await Shop.findOne();
    if (sampleShop) {
      console.log(`Sample shop: ${sampleShop.name}`);
      console.log(`Location type: ${sampleShop.location?.type}`);
      console.log(`Coordinates: ${JSON.stringify(sampleShop.location?.coordinates)}`);
      console.log(`Open status: ${sampleShop.isOpen}`);
    }

    // Count wholesale shops that are open
    console.log('\n📊 Wholesale shops summary:');
    const wholesaleShops = await Shop.countDocuments({ type: 'wholesale', isOpen: true });
    console.log(`Wholesale shops (open): ${wholesaleShops}\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ Geospatial index fixed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('Now shops should appear on the map when you:');
    console.log('1. Start the backend: npm start');
    console.log('2. Start the frontend: npm start');
    console.log('3. Login as retail shop owner');
    console.log('4. Go to the dashboard - shops should display on map\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
};

fixGeospatialIndex();
