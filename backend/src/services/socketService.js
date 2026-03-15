const { getIO } = require('./socket');
const logger = require('../utils/logger');

/**
 * Real-time event emission service
 * Broadcasts events to appropriate Socket.io rooms
 */

const socketService = {
  // NEW ORDER EVENT
  emitNewOrder: (shopId, orderData) => {
    const io = getIO();
    logger.debug('Emitting newOrder event', { shopId, orderId: orderData.orderId });
    // Emit to wholesale shop (for queue)
    io.to(`shop:${shopId}`).emit('newOrder', orderData);
    // Emit to retail customer (for analytics update)
    if (orderData.retailerId) {
      io.to(`user:${orderData.retailerId}`).emit('newOrder', orderData);
    }
  },

  // ORDER STATUS UPDATE
  emitOrderStatusUpdated: (shopId, retailers, orderData) => {
    const io = getIO();
    logger.debug('Emitting orderStatusUpdated event', { shopId, orderId: orderData._id, status: orderData.status });
    
    // Notify wholesale shop
    io.to(`shop:${shopId}`).emit('orderStatusUpdated', orderData);
    
    // Notify all retailers with orders
    retailers?.forEach(retailerId => {
      io.to(`user:${retailerId}`).emit('orderStatusUpdated', orderData);
    });
  },

  // QUEUE POSITION UPDATE
  emitQueueUpdated: (shopId, queueData) => {
    const io = getIO();
    logger.debug('Emitting queueUpdated event', { shopId, queueLength: queueData.length });
    
    // Notify wholesale shop
    io.to(`shop:${shopId}`).emit('queueUpdated', queueData);
    
    // Notify all retailers
    io.to(`role:retail`).emit('queueUpdated', queueData);
  },

  // INVENTORY UPDATE
  emitInventoryUpdated: (productId, shopId, product) => {
    const io = getIO();
    logger.debug('Emitting inventoryUpdated event', { 
      productId, 
      shopId, 
      stockAvailable: product.stockAvailable 
    });
    
    // Notify all users
    io.to(`shop:${shopId}`).emit('inventoryUpdated', product);
    io.to(`role:retail`).emit('inventoryUpdated', product);
  },

  // SHOP STATUS CHANGE
  emitShopStatusChanged: (shopId, shopData) => {
    const io = getIO();
    logger.debug('Emitting shopStatusChanged event', { shopId, isOpen: shopData.isOpen });
    
    // Notify all retailers
    io.to(`role:retail`).emit('shopStatusChanged', {
      shopId,
      isOpen: shopData.isOpen,
      name: shopData.name
    });
  },

  // PAYMENT CONFIRMED
  emitPaymentConfirmed: (shopId, paymentData) => {
    const io = getIO();
    logger.debug('Emitting paymentConfirmed event', { shopId, orderId: paymentData.orderId });
    
    // Notify wholesale shop
    io.to(`shop:${shopId}`).emit('paymentConfirmed', paymentData);
    // Notify retail customer
    if (paymentData.retailerId) {
      io.to(`user:${paymentData.retailerId}`).emit('paymentConfirmed', paymentData);
    }
  },

  // NEW REVIEW
  emitNewReview: (shopId, review) => {
    const io = getIO();
    logger.debug('Emitting newReview event', { shopId, rating: review.rating });
    
    io.to(`shop:${shopId}`).emit('newReview', review);
    io.to(`role:wholesale`).emit('newReview', review);
  },

  // NEW COMPLAINT
  emitNewComplaint: (complaint) => {
    const io = getIO();
    logger.debug('Emitting newComplaint event', { complaintId: complaint._id });
    
    io.to(`role:admin`).emit('newComplaint', complaint);
  },

  // ANALYTICS UPDATED
  emitAnalyticsUpdated: (userId, analyticsData) => {
    const io = getIO();
    logger.debug('Emitting analyticsUpdated event', { userId });
    
    io.to(`user:${userId}`).emit('analyticsUpdated', analyticsData);
  },

  // KHATA UPDATED
  emitKhataUpdated: (retailerId, khataData) => {
    const io = getIO();
    logger.debug('Emitting khataUpdated event', { retailerId });
    
    io.to(`user:${retailerId}`).emit('khataUpdated', khataData);
  },

  // MESSAGE
  emitMessage: (recipientId, messageData) => {
    const io = getIO();
    logger.debug('Emitting message event', { recipientId, from: messageData.from });
    
    io.to(`user:${recipientId}`).emit('newMessage', messageData);
  },

  // BROADCAST TO ALL ADMINS
  broadcastToAdmins: (eventName, data) => {
    const io = getIO();
    logger.debug('Broadcasting to admins', { event: eventName });
    
    io.to(`role:admin`).emit(eventName, data);
  },

  // BROADCAST TO ALL RETAILERS
  broadcastToRetailers: (eventName, data) => {
    const io = getIO();
    logger.debug('Broadcasting to retailers', { event: eventName });
    
    io.to(`role:retail`).emit(eventName, data);
  },

  // BROADCAST TO ALL WHOLESALERS
  broadcastToWholesalers: (eventName, data) => {
    const io = getIO();
    logger.debug('Broadcasting to wholesalers', { event: eventName });
    
    io.to(`role:wholesale`).emit(eventName, data);
  },

  // INVENTORY UPDATED (Stock deduction)
  emitInventoryUpdated: (shopId, inventoryData) => {
    const io = getIO();
    logger.debug('Emitting inventoryUpdated event', { 
      shopId, 
      productName: inventoryData.productName,
      newStock: inventoryData.newStock
    });
    
    // Notify wholesale shop
    io.to(`shop:${shopId}`).emit('inventoryUpdated', inventoryData);
    // Broadcast to all retailers
    io.to(`role:retail`).emit('inventoryUpdated', inventoryData);
  },

  // STOCK ALERT (Out of stock / Low stock)
  emitStockAlert: (shopId, alertData) => {
    const io = getIO();
    logger.debug('Emitting stockAlert event', { 
      shopId, 
      productName: alertData.productName,
      status: alertData.status
    });
    
    // Notify wholesale shop
    io.to(`shop:${shopId}`).emit('stockAlert', alertData);
    // Broadcast to all retailers
    io.to(`role:retail`).emit('stockAlert', alertData);
  }
};

module.exports = socketService;
