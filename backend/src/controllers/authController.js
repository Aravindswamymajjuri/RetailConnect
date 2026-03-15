const User = require('../models/User');
const Shop = require('../models/Shop');
const { generateToken } = require('../config/jwt');

exports.registerRetail = async (req, res) => {
  try {
    console.log('\n========== REGISTER RETAIL START ==========');
    console.log('📝 Request Body:', req.body);
    const { name, email, password, mobile, shopName, address, location, category, gstNumber } = req.body;

    // Validate location
    if (!location || !location.latitude || !location.longitude) {
      console.error('❌ Invalid location:', location);
      return res.status(400).json({ message: 'Invalid location data' });
    }

    // Check if user already exists
    console.log('🔍 Checking if user exists for email:', email);
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.warn('⚠️ User already exists:', email);
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user
    console.log('👤 Creating new user...');
    const user = new User({
      name,
      email,
      password,
      mobile,
      role: 'retail',
      isApproved: false
    });

    await user.save();
    console.log('✅ User created successfully:', user._id);

    // Create shop
    console.log('🏪 Creating shop for user...');
    console.log('📍 Location coordinates:', [location.longitude, location.latitude]);
    const shop = new Shop({
      owner: user._id,
      name: shopName,
      type: 'retail',
      address,
      location: {
        type: 'Point',
        coordinates: [location.longitude, location.latitude]
      },
      category,
      gstNumber: gstNumber || undefined
    });

    await shop.save();
    console.log('✅ Shop created successfully:', shop._id);

    // Update user with shopId
    console.log('🔗 Updating user with shopId...');
    user.shopId = shop._id;
    user.isApproved = true;
    await user.save();
    console.log('✅ User updated with shopId');

    // Generate token
    console.log('🔐 Generating token...');
    const token = generateToken(user._id, user.role, shop._id);
    console.log('✅ Token generated successfully');

    console.log('========== REGISTER RETAIL SUCCESS ==========\n');
    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        shopId: shop._id
      }
    });
  } catch (error) {
    console.error('========== REGISTER RETAIL ERROR ==========');
    console.error('❌ Error Message:', error.message);
    console.error('❌ Error Name:', error.name);
    console.error('❌ Error Stack:', error.stack);
    console.error('❌ Full Error Object:', error);
    console.error('===========================================\n');
    res.status(500).json({ 
      message: 'Registration error', 
      error: error.message,
      errorName: error.name
    });
  }
};

exports.registerWholesale = async (req, res) => {
  try {
    console.log('📝 Register Wholesale Request:', req.body);
    const { name, email, password, mobile, shopName, address, location, gstNumber, upiId, openingTime, closingTime } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user
    const user = new User({
      name,
      email,
      password,
      mobile,
      role: 'wholesale',
      isApproved: false
    });

    await user.save();

    // Create shop
    const shop = new Shop({
      owner: user._id,
      name: shopName,
      type: 'wholesale',
      address,
      location: {
        type: 'Point',
        coordinates: [location.longitude, location.latitude]
      },
      gstNumber,
      upiId,
      openingTime,
      closingTime
    });

    await shop.save();

    // Update user with shopId
    user.shopId = shop._id;
    user.isApproved = true;
    await user.save();

    const token = generateToken(user._id, user.role, shop._id);

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        shopId: shop._id
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Registration error', error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const logger = require('../utils/logger');
    const { email, password } = req.body;

    logger.debug('Login attempt', { email });

    const user = await User.findOne({ email });

    if (!user) {
      logger.warn('Login failed: User not found', { email });
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (user.isSuspended) {
      logger.warn('Login failed: Account suspended', { email });
      return res.status(403).json({ message: 'Account is suspended' });
    }

    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      logger.warn('Login failed: Invalid password', { email });
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id, user.role, user.shopId);

    logger.success('Login successful', {
      userId: user._id,
      email: user.email,
      role: user.role,
      shopId: user.shopId
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        shopId: user.shopId
      }
    });
  } catch (error) {
    const logger = require('../utils/logger');
    logger.error('Login error', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: 'Login error', error: error.message });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const logger = require('../utils/logger');
    const user = await User.findById(req.user.userId).select('-password');
    
    logger.success('User fetched successfully', {
      userId: user._id,
      email: user.email,
      role: user.role,
      shopId: user.shopId,
      isApproved: user.isApproved
    });

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      shopId: user.shopId,
      isApproved: user.isApproved,
      isSuspended: user.isSuspended
    });
  } catch (error) {
    const logger = require('../utils/logger');
    logger.error('Error fetching current user', {
      userId: req.user?.userId,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: 'Error fetching user', error: error.message });
  }
};
