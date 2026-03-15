const Order = require('../models/Order');
const Product = require('../models/Product');
const Shop = require('../models/Shop');
const logger = require('../utils/logger');

/**
 * Get retail analytics
 */
exports.getRetailAnalytics = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get total orders
    const totalOrders = await Order.countDocuments({ retailer: userId });

    // Get total spending
    const spendingData = await Order.aggregate([
      { $match: { retailer: userId } },
      {
        $group: {
          _id: null,
          totalSpending: { $sum: '$totalAmount' }
        }
      }
    ]);
    const totalSpending = spendingData[0]?.totalSpending || 0;

    // Debug log
    logger.debug('Spending aggregation result', {
      userId,
      totalOrders,
      spendingDataLength: spendingData.length,
      spendingData,
      totalSpending
    });

    // Get monthly data (last 12 months)
    const monthlyData = await Order.aggregate([
      { $match: { retailer: userId } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          spending: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);

    // Get top products
    const topProducts = await Order.aggregate([
      { $match: { retailer: userId } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          productName: { $first: '$items.productName' },
          quantity: { $sum: '$items.quantity' },
          spent: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      { $sort: { quantity: -1 } },
      { $limit: 5 }
    ]);

    // Get order status breakdown
    const orderStatusBreakdown = await Order.aggregate([
      { $match: { retailer: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const statusBreakdown = {};
    orderStatusBreakdown.forEach(item => {
      statusBreakdown[item._id] = item.count;
    });

    logger.success('Retail analytics retrieved', {
      totalOrders,
      totalSpending
    });

    res.json({
      totalOrders,
      totalSpending,
      monthlyData,
      topProducts,
      orderStatusBreakdown: statusBreakdown
    });
  } catch (error) {
    logger.error('Error fetching retail analytics', { error: error.message });
    res.status(500).json({
      message: 'Error fetching analytics',
      error: error.message
    });
  }
};

/**
 * Get all expenditures for retail user (across all shops)
 */
exports.getExpenditureAnalytics = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get total expenditure across all shops
    const totalExpenditureData = await Order.aggregate([
      { $match: { retailer: userId } },
      {
        $group: {
          _id: null,
          totalExpenditure: { $sum: '$totalAmount' }
        }
      }
    ]);
    const totalExpenditure = totalExpenditureData[0]?.totalExpenditure || 0;

    logger.debug('Expenditure aggregation result', {
      userId,
      totalExpenditureDataLength: totalExpenditureData.length,
      totalExpenditureData,
      totalExpenditure
    });

    // Get expenditure by shop
    const expenditureByShop = await Order.aggregate([
      { $match: { retailer: userId } },
      {
        $group: {
          _id: '$wholesalerShop',
          shopExpenditure: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
          avgOrderValue: { $avg: '$totalAmount' }
        }
      },
      { $sort: { shopExpenditure: -1 } }
    ]);

    // Populate shop details
    const expenditureWithShopDetails = await Promise.all(
      expenditureByShop.map(async (item) => {
        const shop = await Shop.findById(item._id).select('name address owner');
        return {
          shopId: item._id,
          shopName: shop?.name || 'Unknown Shop',
          shopAddress: shop?.address || '',
          expenditure: item.shopExpenditure,
          orderCount: item.orderCount,
          avgOrderValue: parseFloat(item.avgOrderValue.toFixed(2))
        };
      })
    );

    // Get monthly expenditure trend
    const monthlyExpenditure = await Order.aggregate([
      { $match: { retailer: userId } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          expenditure: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);

    // Get top spent shops
    const topSpentShops = expenditureWithShopDetails.slice(0, 5);

    // Get expenditure by order status (order fulfillment status)
    const expenditureByOrderStatus = await Order.aggregate([
      { $match: { retailer: userId } },
      {
        $group: {
          _id: '$status',
          expenditure: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Get expenditure by payment status (payment completion status)
    const expenditureByPaymentStatus = await Order.aggregate([
      { $match: { retailer: userId } },
      {
        $group: {
          _id: '$paymentStatus',
          expenditure: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    logger.success('Expenditure analytics retrieved', {
      totalExpenditure,
      shopCount: expenditureWithShopDetails.length
    });

    res.json({
      totalExpenditure: parseFloat(totalExpenditure.toFixed(2)),
      totalShopsUsed: expenditureWithShopDetails.length,
      expenditureByShop: expenditureWithShopDetails,
      topSpentShops,
      monthlyExpenditure,
      expenditureByOrderStatus,
      expenditureByPaymentStatus
    });
  } catch (error) {
    logger.error('Error fetching expenditure analytics', { error: error.message });
    res.status(500).json({
      message: 'Error fetching expenditure analytics',
      error: error.message
    });
  }
};

/**
 * Get wholesale analytics
 */
exports.getWholesaleAnalytics = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get shop
    const shop = await Shop.findOne({ owner: userId });
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    // Get total orders received
    const totalOrdersReceived = await Order.countDocuments({ wholesalerShop: shop._id });

    // Get total revenue
    const revenueData = await Order.aggregate([
      { $match: { wholesalerShop: shop._id } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' }
        }
      }
    ]);
    const totalRevenue = revenueData[0]?.totalRevenue || 0;

    // Get monthly revenue
    const monthlyRevenue = await Order.aggregate([
      { $match: { wholesalerShop: shop._id } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);

    // Get most sold products
    const mostSoldProducts = await Order.aggregate([
      { $match: { wholesalerShop: shop._id } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          productName: { $first: '$items.productName' },
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      { $sort: { quantity: -1 } },
      { $limit: 10 }
    ]);

    // Get order status breakdown
    const orderStatusBreakdown = await Order.aggregate([
      { $match: { wholesalerShop: shop._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const statusBreakdown = {};
    orderStatusBreakdown.forEach(item => {
      statusBreakdown[item._id] = item.count;
    });

    logger.success('Wholesale analytics retrieved', {
      totalOrdersReceived,
      totalRevenue
    });

    res.json({
      totalOrdersReceived,
      totalRevenue,
      monthlyRevenue,
      mostSoldProducts,
      orderStatusBreakdown: statusBreakdown
    });
  } catch (error) {
    logger.error('Error fetching wholesale analytics', { error: error.message });
    res.status(500).json({
      message: 'Error fetching analytics',
      error: error.message
    });
  }
};

/**
 * Get analytics for a specific shop (from retailer perspective)
 */
exports.getShopAnalytics = async (req, res) => {
  try {
    const { shopId } = req.params;
    const userId = req.user.userId;

    // Verify shop exists
    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    // Get total orders placed at this shop
    const totalOrders = await Order.countDocuments({
      wholesalerShop: shopId,
      retailer: userId
    });

    // Get total spending and calculate average
    const spendingData = await Order.aggregate([
      { $match: { wholesalerShop: shopId, retailer: userId } },
      {
        $group: {
          _id: null,
          totalSpending: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 }
        }
      }
    ]);

    const totalSpending = spendingData[0]?.totalSpending || 0;
    const orderCount = spendingData[0]?.orderCount || 0;
    const avgOrderValue = orderCount > 0 ? totalSpending / orderCount : 0;

    // Get monthly spending data
    const monthlyData = await Order.aggregate([
      { $match: { wholesalerShop: shopId, retailer: userId } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          spending: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);

    // Get top products purchased from this shop
    const topProducts = await Order.aggregate([
      { $match: { wholesalerShop: shopId, retailer: userId } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          productName: { $first: '$items.productName' },
          quantity: { $sum: '$items.quantity' },
          spent: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      { $sort: { quantity: -1 } },
      { $limit: 5 }
    ]);

    // Get top product (most purchased)
    const topProduct = topProducts[0] || null;

    // Get most purchased products (different from top products query)
    const mostPurchasedProducts = await Order.aggregate([
      { $match: { wholesalerShop: shopId, retailer: userId } },
      { $unwind: '$cartItems' },
      {
        $group: {
          _id: '$cartItems.productName',
          totalQuantity: { $sum: '$cartItems.quantity' },
          totalSpent: { $sum: { $multiply: ['$cartItems.quantity', '$cartItems.pricePerUnit'] } },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 }
    ]);

    // Get order status breakdown
    const orderStatusBreakdown = await Order.aggregate([
      { $match: { wholesalerShop: shopId, retailer: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const statusBreakdown = {};
    orderStatusBreakdown.forEach(item => {
      statusBreakdown[item._id] = item.count;
    });

    logger.success('Shop analytics retrieved', {
      shopId,
      totalSpending,
      avgOrderValue
    });

    res.json({
      shopId,
      shopName: shop.name,
      totalSpending,
      avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),
      topProduct,
      monthlyData,
      mostPurchasedProducts,
      orderStatusBreakdown: statusBreakdown,
      totalOrders: orderCount
    });
  } catch (error) {
    logger.error('Error fetching shop analytics', { error: error.message });
    res.status(500).json({
      message: 'Error fetching shop analytics',
      error: error.message
    });
  }
};
