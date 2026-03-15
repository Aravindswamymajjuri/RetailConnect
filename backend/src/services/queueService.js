const Order = require('../models/Order');
const logger = require('../utils/logger');
const socketService = require('./socketService');

/**
 * Queue Management Service
 * Handles order queue operations and position tracking
 */

const queueService = {
  /**
   * Add order to queue
   * @param {string} shopId - Wholesaler shop ID
   * @param {Object} orderData - Order data
   * @returns {Promise<Object>} Updated order with queue position
   */
  addToQueue: async (shopId, orderData) => {
    try {
      logger.debug('Adding order to queue', { shopId, orderId: orderData._id });

      // Count current orders in queue for this shop
      const queueCount = await Order.countDocuments({
        wholesalerShop: shopId,
        status: { $ne: 'Completed' }
      });

      orderData.queuePosition = queueCount + 1;
      await orderData.save();

      // Emit queue update
      const queue = await queueService.getShopQueue(shopId);
      socketService.emitQueueUpdated(shopId, queue);

      logger.success('Order added to queue', { 
        shopId, 
        queuePosition: orderData.queuePosition 
      });

      return orderData;
    } catch (error) {
      logger.error('Error adding order to queue', { error: error.message });
      throw error;
    }
  },

  /**
   * Get shop's order queue
   * @param {string} shopId - Wholesaler shop ID
   * @returns {Promise<Array>} Queue orders
   */
  getShopQueue: async (shopId) => {
    try {
      logger.debug('Fetching shop queue', { shopId });

      const queue = await Order.find({
        wholesalerShop: shopId,
        status: { $ne: 'Completed' }
      })
        .sort({ createdAt: 1 })
        .populate('retailer', 'name email')
        .populate('retailerShop', 'name address')
        .lean();

      // Recalculate queue positions
      queue.forEach((order, index) => {
        order.queuePosition = index + 1;
      });

      logger.success('Queue fetched', { shopId, queueLength: queue.length });
      return queue;
    } catch (error) {
      logger.error('Error fetching shop queue', { error: error.message });
      throw error;
    }
  },

  /**
   * Get user's orders in queue
   * @param {string} userId - Retailer user ID
   * @returns {Promise<Array>} User's orders
   */
  getUserOrders: async (userId) => {
    try {
      logger.debug('Fetching user orders', { userId });

      const orders = await Order.find({ retailer: userId })
        .sort({ createdAt: -1 })
        .populate('wholesalerShop', 'name address')
        .populate('items.product', 'name price')
        .lean();

      logger.success('User orders fetched', { userId, count: orders.length });
      return orders;
    } catch (error) {
      logger.error('Error fetching user orders', { error: error.message });
      throw error;
    }
  },

  /**
   * Update order status
   * @param {string} orderId - Order ID
   * @param {string} newStatus - New status
   * @returns {Promise<Object>} Updated order
   */
  updateOrderStatus: async (orderId, newStatus) => {
    try {
      logger.debug('Updating order status', { orderId, newStatus });

      const Product = require('../models/Product');
      const order = await Order.findById(orderId);

      if (!order) {
        throw new Error('Order not found');
      }

      // Update inventory when order status changes to Preparing, Ready for Pickup, or Completed
      if (['Preparing', 'Ready for Pickup', 'Completed'].includes(newStatus)) {
        logger.debug('Updating inventory for order items', { orderId, itemCount: order.items.length });

        // Deduct inventory for each item in the order
        for (const item of order.items) {
          const product = await Product.findById(item.product);
          if (product) {
            const previousStock = product.stockAvailable;
            product.stockAvailable = Math.max(0, product.stockAvailable - item.quantity);
            await product.save();

            logger.success('Product inventory updated', {
              productId: item.product,
              productName: product.name,
              quantityDeducted: item.quantity,
              previousStock,
              newStock: product.stockAvailable
            });

            // Emit real-time inventory alert
            socketService.emitInventoryUpdated(order.wholesalerShop, {
              productId: item.product,
              productName: product.name,
              previousStock,
              newStock: product.stockAvailable,
              quantityDeducted: item.quantity,
              status: 'STOCK_REDUCED'
            });

            // Check if product is out of stock or low stock
            if (product.stockAvailable === 0) {
              logger.warn('Product out of stock', { productId: item.product, productName: product.name });
              socketService.emitStockAlert(order.wholesalerShop, {
                productId: item.product,
                productName: product.name,
                status: 'OUT_OF_STOCK',
                currentStock: product.stockAvailable
              });
            } else if (product.stockAvailable <= 5) {
              logger.warn('Product low in stock', { productId: item.product, productName: product.name, stock: product.stockAvailable });
              socketService.emitStockAlert(order.wholesalerShop, {
                productId: item.product,
                productName: product.name,
                status: 'LOW_STOCK',
                currentStock: product.stockAvailable
              });
            }
          }
        }
      }

      const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        {
          status: newStatus,
          completedAt: newStatus === 'Completed' ? new Date() : null
        },
        { new: true }
      ).populate('retailer wholesaler wholesalerShop');

      // Emit status update
      socketService.emitOrderStatusUpdated(
        updatedOrder.wholesalerShop._id,
        [updatedOrder.retailer._id],
        updatedOrder
      );

      logger.success('Order status updated', { orderId, status: newStatus });
      return updatedOrder;
    } catch (error) {
      logger.error('Error updating order status', { error: error.message });
      throw error;
    }
  },

  /**
   * Confirm payment for order
   * @param {string} orderId - Order ID
   * @param {string} transactionId - UPI transaction ID
   * @returns {Promise<Object>} Updated order
   */
  confirmPayment: async (orderId, transactionId) => {
    try {
      logger.debug('Confirming payment', { orderId, transactionId });

      const order = await Order.findByIdAndUpdate(
        orderId,
        {
          paymentStatus: 'Completed',
          upiTransactionId: transactionId,
          status: 'Preparing'
        },
        { new: true }
      ).populate('retailer wholesaler wholesalerShop');

      if (!order) {
        throw new Error('Order not found');
      }

      // Emit payment confirmation
      socketService.emitPaymentConfirmed(order.wholesalerShop._id, {
        orderId: order._id,
        retailerId: order.retailer._id,
        amount: order.totalAmount,
        retailerShop: order.retailerShop,
        transactionId
      });

      logger.success('Payment confirmed', { orderId, transactionId });
      return order;
    } catch (error) {
      logger.error('Error confirming payment', { error: error.message });
      throw error;
    }
  },

  /**
   * Get queue statistics
   * @param {string} shopId - Wholesaler shop ID
   * @returns {Promise<Object>} Queue statistics
   */
  getQueueStats: async (shopId) => {
    try {
      logger.debug('Calculating queue statistics', { shopId });

      const stats = await Order.aggregate([
        { $match: { wholesalerShop: shopId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const queueLength = await Order.countDocuments({
        wholesalerShop: shopId,
        status: { $ne: 'Completed' }
      });

      const result = {
        totalOrders: stats.reduce((sum, s) => sum + s.count, 0),
        queueLength,
        byStatus: {}
      };

      stats.forEach((stat) => {
        result.byStatus[stat._id] = stat.count;
      });

      logger.success('Queue statistics calculated', { shopId, stats: result });
      return result;
    } catch (error) {
      logger.error('Error calculating queue statistics', { error: error.message });
      throw error;
    }
  }
};

module.exports = queueService;
