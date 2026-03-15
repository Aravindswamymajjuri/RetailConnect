const Order = require('../models/Order');
const Product = require('../models/Product');
const Shop = require('../models/Shop');
const KhataRecord = require('../models/KhataRecord');
const Review = require('../models/Review');
const logger = require('../utils/logger');

/**
 * Get stock alerts for wholesale shop
 */
exports.getStockAlerts = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get shop
    const shop = await Shop.findOne({ owner: userId });
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    // Get all products with stock info
    const products = await Product.find({ shop: shop._id }).select('name stockAvailable category');

    const alerts = {
      outOfStock: [],
      lowStock: [],
      fewItemsLeft: []
    };

    const LOW_STOCK_THRESHOLD = 10;
    const FEW_ITEMS_THRESHOLD = 20;

    products.forEach(product => {
      if (product.stockAvailable === 0) {
        alerts.outOfStock.push({
          id: product._id,
          name: product.name,
          category: product.category,
          current: 0,
          threshold: LOW_STOCK_THRESHOLD
        });
      } else if (product.stockAvailable <= LOW_STOCK_THRESHOLD) {
        alerts.lowStock.push({
          id: product._id,
          name: product.name,
          category: product.category,
          current: product.stockAvailable,
          threshold: LOW_STOCK_THRESHOLD
        });
      } else if (product.stockAvailable <= FEW_ITEMS_THRESHOLD) {
        alerts.fewItemsLeft.push({
          id: product._id,
          name: product.name,
          category: product.category,
          current: product.stockAvailable,
          threshold: FEW_ITEMS_THRESHOLD
        });
      }
    });

    logger.success('Stock alerts retrieved', { outOfStock: alerts.outOfStock.length });
    res.json(alerts);
  } catch (error) {
    logger.error('Error getting stock alerts', { error: error.message });
    res.status(500).json({ message: 'Error getting stock alerts', error: error.message });
  }
};

/**
 * Get real-time order queue for wholesale shop
 */
exports.getOrderQueue = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get shop
    const shop = await Shop.findOne({ owner: userId });
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    // Get orders for this shop, sorted by queue position
    const orders = await Order.find({ wholesalerShop: shop._id })
      .populate('retailer', 'name email mobile')
      .populate('retailerShop', 'name address')
      .populate('items.product', 'name price')
      .sort({ queuePosition: 1, createdAt: 1 })
      .lean();

    // Add queue status
    const queuedOrders = orders.map((order, index) => ({
      ...order,
      queuePosition: index + 1,
      isNext: index === 0 && order.status === 'Waiting'
    }));

    logger.success('Order queue retrieved', { count: queuedOrders.length });
    res.json(queuedOrders);
  } catch (error) {
    logger.error('Error getting order queue', { error: error.message });
    res.status(500).json({ message: 'Error getting order queue', error: error.message });
  }
};

/**
 * Update order status
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;

    // Validate status
    const validStatuses = ['Waiting', 'Preparing', 'Ready for Pickup', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Get order and verify ownership
    const order = await Order.findById(orderId).populate('wholesalerShop');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const shop = await Shop.findOne({ _id: order.wholesalerShop._id, owner: userId });
    if (!shop) {
      return res.status(403).json({ message: 'Not authorized to update this order' });
    }

    // Update status
    order.status = status;
    if (status === 'Completed') {
      order.completedAt = new Date();
    }
    await order.save();

    // Emit real-time update
    const { getIO } = require('../services/socket');
    const io = getIO();
    io.to(`user:${order.retailer}`).emit('orderStatusUpdated', {
      orderId: order._id,
      status: order.status,
      completedAt: order.completedAt
    });

    logger.success('Order status updated', { orderId, status });
    res.json({ message: 'Order status updated', order });
  } catch (error) {
    logger.error('Error updating order status', { error: error.message });
    res.status(500).json({ message: 'Error updating order status', error: error.message });
  }
};

/**
 * Get sales analytics for wholesale shop
 */
exports.getSalesAnalytics = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { startDate, endDate } = req.query;

    // Get shop
    const shop = await Shop.findOne({ owner: userId });
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    // Build date filter
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    // Get daily sales (last 30 days)
    const dailySales = await Order.aggregate([
      {
        $match: {
          wholesalerShop: shop._id,
          status: { $in: ['Ready for Pickup', 'Completed'] },
          createdAt: dateFilter.$gte ? { $gte: dateFilter.$gte } : undefined
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          sales: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 30 }
    ]);

    // Get monthly sales (last 12 months)
    const monthlySales = await Order.aggregate([
      {
        $match: {
          wholesalerShop: shop._id,
          status: { $in: ['Ready for Pickup', 'Completed'] }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          sales: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);

    // Get top selling products
    const topProducts = await Order.aggregate([
      { $match: { wholesalerShop: shop._id } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      { $sort: { quantity: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productInfo'
        }
      }
    ]);

    // Get revenue summary
    const revenueSummary = await Order.aggregate([
      {
        $match: {
          wholesalerShop: shop._id,
          status: { $in: ['Ready for Pickup', 'Completed'] }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      }
    ]);

    logger.success('Sales analytics retrieved', { shop: shop._id });
    res.json({
      dailySales,
      monthlySales,
      topProducts,
      revenueSummary: revenueSummary[0] || { totalRevenue: 0, totalOrders: 0, averageOrderValue: 0 }
    });
  } catch (error) {
    logger.error('Error getting sales analytics', { error: error.message });
    res.status(500).json({ message: 'Error getting sales analytics', error: error.message });
  }
};

/**
 * Update shop status (Open/Closed)
 */
exports.updateShopStatus = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { isOpen } = req.body;

    // Get shop
    const shop = await Shop.findOne({ owner: userId });
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    // Update status
    shop.isOpen = isOpen;
    await shop.save();

    // Emit real-time update to all connected users
    const { getIO } = require('../services/socket');
    const io = getIO();
    io.emit('shopStatusChanged', {
      shopId: shop._id,
      shopName: shop.name,
      isOpen: shop.isOpen
    });

    logger.success('Shop status updated', { shopId: shop._id, isOpen });
    res.json({ message: 'Shop status updated', shop });
  } catch (error) {
    logger.error('Error updating shop status', { error: error.message });
    res.status(500).json({ message: 'Error updating shop status', error: error.message });
  }
};

/**
 * Get khata records (digital ledger)
 */
exports.getKhataRecords = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get shop
    const shop = await Shop.findOne({ owner: userId });
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    // Get khata records
    const khataRecords = await KhataRecord.find({ wholesalerShop: shop._id })
      .populate('retailer', 'name email mobile')
      .populate('retailerShop', 'name')
      .sort({ createdAt: -1 });

    logger.success('Khata records retrieved', { count: khataRecords.length });
    res.json(khataRecords);
  } catch (error) {
    logger.error('Error getting khata records', { error: error.message });
    res.status(500).json({ message: 'Error getting khata records', error: error.message });
  }
};

/**
 * Get ratings and reviews
 */
exports.getReviews = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get shop
    const shop = await Shop.findOne({ owner: userId });
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    // Get reviews
    const reviews = await Review.find({ shop: shop._id })
      .populate('reviewer', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    // Calculate average rating
    const avgRating = reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : 0;

    logger.success('Reviews retrieved', { shop: shop._id, count: reviews.length });
    res.json({ reviews, avgRating, totalReviews: reviews.length });
  } catch (error) {
    logger.error('Error getting reviews', { error: error.message, stack: error.stack });
    console.error('Full error:', error);
    res.status(500).json({ message: 'Error getting reviews', error: error.message });
  }
};
