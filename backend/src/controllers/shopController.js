const Shop = require('../models/Shop');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Review = require('../models/Review');
const logger = require('../utils/logger');
const locationService = require('../services/locationService');
const socketService = require('../services/socketService');

/**
 * Get nearby wholesale shops for retail shop owner
 */
exports.getNearbyWholesaleShops = async (req, res) => {
  try {
    const { longitude, latitude, maxDistance = 50000 } = req.body;

    logger.debug('Finding nearby wholesale shops', { latitude, longitude, maxDistance });

    // Validate coordinates
    if (!locationService.isValidLocation(latitude, longitude)) {
      logger.error('Invalid location coordinates', { latitude, longitude });
      return res.status(400).json({ message: 'Invalid location coordinates' });
    }

    // Find wholesale shops
    const wholesaleShops = await Shop.find({
      type: 'wholesale',
      isOpen: true,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: maxDistance
        }
      }
    })
      .populate('owner', 'name mobile email')
      .lean();

    if (!wholesaleShops || wholesaleShops.length === 0) {
      logger.warn('No nearby wholesale shops found', { latitude, longitude });
      return res.json({ 
        shops: [],
        message: 'No nearby wholesale shops found'
      });
    }

    // Add distance information
    const shopsWithDistance = wholesaleShops.map((shop) => {
      if (!shop.location || !shop.location.coordinates) {
        return null;
      }

      const [shopLon, shopLat] = shop.location.coordinates;
      const distance = locationService.calculateDistance(latitude, longitude, shopLat, shopLon);
      const distanceInfo = locationService.formatDistanceDetailed(distance);

      return {
        ...shop,
        distance: distance,
        distanceKm: distanceInfo.km,
        distanceMeters: distanceInfo.meters,
        distanceText: distanceInfo.text,
        distanceFullText: distanceInfo.fullText
      };
    }).filter(shop => shop !== null)
      .sort((a, b) => a.distance - b.distance);

    logger.success('Nearby wholesale shops found', { count: shopsWithDistance.length });

    res.json({
      shops: shopsWithDistance,
      count: shopsWithDistance.length
    });
  } catch (error) {
    logger.error('Error fetching nearby wholesale shops', { error: error.message });
    res.status(500).json({ message: 'Error fetching shops', error: error.message });
  }
};

/**
 * Get detailed shop profile
 */
exports.getShopProfile = async (req, res) => {
  try {
    const { shopId } = req.params;

    logger.debug('Fetching shop profile', { shopId });

    const shop = await Shop.findById(shopId)
      .populate('owner', 'name mobile email');

    if (!shop) {
      logger.warn('Shop not found', { shopId });
      return res.status(404).json({ message: 'Shop not found' });
    }

    // Get shop statistics
    const productCount = await Product.countDocuments({ shop: shopId, isActive: true });
    const orderCount = await Order.countDocuments({ wholesalerShop: shopId });
    const reviewCount = await Review.countDocuments({ shop: shopId });

    const avgRating = await Review.aggregate([
      { $match: { shop: shopId } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' }
        }
      }
    ]);

    logger.success('Shop profile fetched', { shopId });

    res.json({
      ...shop.toObject(),
      stats: {
        productCount,
        orderCount,
        reviewCount,
        avgRating: avgRating[0]?.avgRating || 0
      }
    });
  } catch (error) {
    logger.error('Error fetching shop profile', { error: error.message });
    res.status(500).json({ message: 'Error fetching shop profile', error: error.message });
  }
};

/**
 * Update shop status (open/closed)
 */
exports.updateShopStatus = async (req, res) => {
  try {
    const { shopId } = req.params;
    const { isOpen } = req.body;

    logger.debug('Updating shop status', { shopId, isOpen });

    const shop = await Shop.findByIdAndUpdate(
      shopId,
      { isOpen },
      { new: true }
    ).populate('owner', 'name');

    if (!shop) {
      logger.warn('Shop not found for update', { shopId });
      return res.status(404).json({ message: 'Shop not found' });
    }

    // Emit real-time event
    socketService.emitShopStatusChanged(shopId, shop);

    logger.success('Shop status updated', { shopId, isOpen });

    res.json({ message: 'Shop status updated', shop });
  } catch (error) {
    logger.error('Error updating shop status', { error: error.message });
    res.status(500).json({ message: 'Error updating shop status', error: error.message });
  }
};

/**
 * Get shop analytics and statistics
 */
exports.getShopAnalytics = async (req, res) => {
  try {
    const shopId = req.user.shopId;

    logger.debug('Fetching shop analytics', { shopId });

    // Get orders data
    const orders = await Order.aggregate([
      { $match: { wholesalerShop: shopId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get revenue data
    const revenue = await Order.aggregate([
      { $match: { wholesalerShop: shopId, paymentStatus: 'Completed' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 }
        }
      }
    ]);

    // Get popular products
    const popularProducts = await Order.aggregate([
      { $match: { wholesalerShop: shopId } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 }
    ]);

    logger.success('Shop analytics fetched', { shopId });

    res.json({
      orders: orders.length > 0 ? orders : [],
      revenue: revenue[0] || { totalRevenue: 0, totalOrders: 0 },
      popularProducts
    });
  } catch (error) {
    logger.error('Error fetching shop analytics', { error: error.message });
    res.status(500).json({ message: 'Error fetching analytics', error: error.message });
  }
};
