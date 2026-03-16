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

    console.log('\n🔵 === UPDATE ORDER STATUS ENDPOINT HIT ===');
    console.log('📍 orderId:', orderId);
    console.log('📍 newStatus:', status);
    console.log('📍 userId:', userId);

    // Validate status
    const validStatuses = ['Waiting', 'Preparing', 'Ready for Pickup', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      console.log('❌ Invalid status');
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Get order and verify ownership
    const order = await Order.findById(orderId).populate('wholesalerShop');
    if (!order) {
      console.log('❌ Order not found');
      return res.status(404).json({ message: 'Order not found' });
    }

    console.log('✅ Order found:', {
      orderId: order._id,
      currentStatus: order.status,
      items: order.items.length,
      inventoryDeducted: order.inventoryDeducted
    });

    const shop = await Shop.findOne({ _id: order.wholesalerShop._id, owner: userId });
    if (!shop) {
      console.log('❌ Not authorized');
      return res.status(403).json({ message: 'Not authorized to update this order' });
    }

    console.log('✅ Shop verified:', shop.name);

    // Deduct inventory when status changes to Preparing, Ready for Pickup, or Completed
    // Check if inventory NOT already deducted (handle both new orders with flag and old orders without flag)
    const shouldDeductInventory = 
      ['Preparing', 'Ready for Pickup', 'Completed'].includes(status) &&
      (order.inventoryDeducted === undefined || order.inventoryDeducted === false);
    
    if (shouldDeductInventory) {
      console.log('💰 DEDUCTING INVENTORY - Processing items:', order.items.length);
      console.log('🔍 inventoryDeducted flag status:', order.inventoryDeducted);

      // Increment soldItems for each product in the order
      for (const item of order.items) {
        try {
          const product = await Product.findById(item.product);
          if (product) {
            const oldSoldCount = product.soldItems || 0;
            const oldAvailableStock = product.stockAvailable - oldSoldCount;
            
            console.log(`📝 Before update - Product "${product.name}": soldItems=${product.soldItems}, stockAvailable=${product.stockAvailable}`);
            
            // Increment sold items
            product.soldItems = (product.soldItems || 0) + item.quantity;
            const newAvailableStock = product.stockAvailable - product.soldItems;
            
            // Save with explicit error handling
            const savedProduct = await product.save();
            console.log(`✅ Product saved successfully`);
            console.log(`📝 After update - Product "${savedProduct.name}": soldItems=${savedProduct.soldItems}, stockAvailable=${savedProduct.stockAvailable}`);
            
            // Verify save by fetching fresh from DB
            const verifyProduct = await Product.findById(item.product);
            console.log(`🔍 Verification from DB - "${verifyProduct.name}": soldItems=${verifyProduct.soldItems}, stockAvailable=${verifyProduct.stockAvailable}`);

            console.log(`✅ Items sold for "${product.name}": ${item.quantity} units | Available: ${oldAvailableStock} → ${newAvailableStock} | Total Sold: ${oldSoldCount} → ${product.soldItems}`);
          } else {
            console.log(`⚠️ Product not found for item:`, item.product);
          }
        } catch (itemError) {
          console.error(`❌ Error processing item for product ${item.product}:`, itemError.message);
          console.error('Stack:', itemError.stack);
        }
      }

      // Mark inventory as deducted
      order.inventoryDeducted = true;
      console.log('✅ Set inventoryDeducted = true');
    } else if (order.inventoryDeducted === true) {
      console.log('⏭️ Inventory already deducted for this order, skipping');
    } else {
      console.log('⏭️ Status is not a "sell" status, skipping inventory deduction');
    }

    // Update order status and completion date
    order.status = status;
    if (status === 'Completed') {
      order.completedAt = new Date();
    }
    await order.save();

    console.log('✅ Order saved with new status:', status);
    console.log('📋 Order after save:', {
      _id: order._id,
      status: order.status,
      inventoryDeducted: order.inventoryDeducted
    });

    // Refresh order from database with fresh populate
    let updatedOrder = await Order.findById(orderId);
    
    // Populate data for response
    updatedOrder = await updatedOrder
      .populate('retailer', 'name email mobile')
      .populate('wholesaler', 'name email')
      .populate('wholesalerShop', 'name address')
      .populate('items.product', 'name price stockAvailable soldItems category unit');

    console.log('✅ Order populated');
    
    // Log populated items to verify soldItems is included
    console.log('📦 Response items with stock details:', updatedOrder.items.map(i => ({
      productId: i.product?._id,
      productName: i.product?.name,
      quantity: i.quantity,
      totalStockAvailable: i.product?.stockAvailable,
      totalSoldItems: i.product?.soldItems,
      currentAvailableStock: (i.product?.stockAvailable || 0) - (i.product?.soldItems || 0)
    })));

    console.log('✅ === END OF SUCCESS ===\n');

    res.json({ 
      message: 'Order status updated successfully', 
      order: updatedOrder 
    });
  } catch (error) {
    console.error('\n❌ === ERROR IN UPDATE ORDER STATUS ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Error updating order status', 
      error: error.message 
    });
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

/**
 * Migration endpoint - Process old orders and update product sold items
 * Call this once to migrate all old completed orders
 */
exports.migrateOrderInventory = async (req, res) => {
  try {
    console.log('\n🚀 === STARTING INVENTORY MIGRATION ===');
    
    // Find all orders with sale statuses but inventoryDeducted not marked
    const oldOrders = await Order.find({
      status: { $in: ['Preparing', 'Ready for Pickup', 'Completed'] },
      $or: [
        { inventoryDeducted: { $exists: false } },
        { inventoryDeducted: false }
      ]
    }).populate('items.product');

    console.log(`📊 Found ${oldOrders.length} orders to process`);

    let processedCount = 0;
    let errorCount = 0;

    for (const order of oldOrders) {
      try {
        console.log(`\n📋 Processing order ${order._id}...`);
        
        // Process each item in the order
        for (const item of order.items) {
          if (item.product) {
            const product = await Product.findById(item.product._id);
            if (product) {
              const oldSoldCount = product.soldItems || 0;
              product.soldItems = (product.soldItems || 0) + item.quantity;
              await product.save();
              
              console.log(`  ✅ ${product.name}: sold ${item.quantity} → total sold: ${product.soldItems}`);
            }
          }
        }
        
        // Mark order as processed
        order.inventoryDeducted = true;
        await order.save();
        
        processedCount++;
        console.log(`✅ Order ${order._id} migration complete`);
      } catch (orderError) {
        errorCount++;
        console.error(`❌ Error processing order ${order._id}:`, orderError.message);
      }
    }

    console.log('\n✅ === MIGRATION COMPLETE ===');
    console.log(`📊 Processed: ${processedCount}, Errors: ${errorCount}`);

    res.json({
      message: 'Migration completed',
      totalOrders: oldOrders.length,
      processedCount,
      errorCount
    });
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    res.status(500).json({
      message: 'Migration error',
      error: error.message
    });
  }
};
