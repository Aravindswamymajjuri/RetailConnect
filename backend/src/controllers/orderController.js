const Order = require('../models/Order');
const Shop = require('../models/Shop');
const Product = require('../models/Product');
const KhataRecord = require('../models/KhataRecord');
const Cart = require('../models/Cart');
const logger = require('../utils/logger');
const socketService = require('../services/socketService');
const upiService = require('../services/upiService');
const queueService = require('../services/queueService');

/**
 * Create new order from cart
 */
exports.createOrder = async (req, res) => {
  try {
    const { wholesalerShopId, cartItems, totalAmount, notes } = req.body;
    const retailerId = req.user.userId;
    const retailerShopId = req.user.shopId;

    logger.debug('Creating order', { retailerId, wholesalerShopId, totalAmount, itemsCount: cartItems?.length });

    // Validate input
    if (!cartItems || cartItems.length === 0) {
      logger.warn('Empty cart items', { retailerId });
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // Validate totalAmount
    if (!totalAmount || totalAmount <= 0) {
      logger.warn('Invalid total amount', { retailerId, totalAmount });
      return res.status(400).json({ message: 'Invalid order amount' });
    }

    // Validate stock availability for each item
    logger.debug('Validating product stock availability', { itemCount: cartItems.length });
    const outOfStockItems = [];
    
    for (const item of cartItems) {
      const product = await Product.findById(item.product);
      if (!product) {
        logger.warn('Product not found', { productId: item.product });
        outOfStockItems.push({ name: 'Unknown Product', requestedQty: item.quantity, availableQty: 0 });
        continue;
      }
      
      if (product.stockAvailable < item.quantity) {
        logger.warn('Insufficient stock', { 
          productId: item.product, 
          productName: product.name,
          requestedQty: item.quantity, 
          availableQty: product.stockAvailable 
        });
        outOfStockItems.push({ 
          name: product.name, 
          requestedQty: item.quantity, 
          availableQty: product.stockAvailable 
        });
      }
    }

    // If any items are out of stock, reject the order
    if (outOfStockItems.length > 0) {
      logger.warn('Order rejected - items out of stock', { retailerId, outOfStockItems });
      return res.status(400).json({ 
        message: 'Some products are not available in the requested quantity', 
        outOfStockItems 
      });
    }

    // Normalize cart items to match Order schema
    const normalizedItems = cartItems.map(item => ({
      product: item.product,
      quantity: item.quantity,
      price: item.pricePerUnit || item.price,
      subtotal: item.total || (item.quantity * (item.pricePerUnit || item.price))
    }));

    // Get retailer shop
    const retailerShop = await Shop.findById(retailerShopId);
    if (!retailerShop) {
      logger.error('Retailer shop not found', { retailerShopId });
      return res.status(404).json({ message: 'Retailer shop not found' });
    }

    // Get wholesaler shop and owner
    const wholesalerShop = await Shop.findById(wholesalerShopId).populate('owner');
    if (!wholesalerShop) {
      logger.error('Wholesaler shop not found', { wholesalerShopId });
      return res.status(404).json({ message: 'Wholesaler shop not found' });
    }

    // Validate wholesaler UPI ID
    if (!wholesalerShop.upiId) {
      logger.error('Wholesaler UPI ID not configured', { wholesalerShopId });
      return res.status(400).json({ message: 'Wholesaler payment method not configured' });
    }

    // Create order
    const order = new Order({
      retailer: retailerId,
      retailerShop: retailerShopId,
      wholesaler: wholesalerShop.owner._id,
      wholesalerShop: wholesalerShopId,
      items: normalizedItems,
      totalAmount: parseFloat(totalAmount),
      status: 'Waiting',
      paymentStatus: 'Pending',
      notes
    });

    await order.save();

    logger.success('Order created', { 
      orderId: order._id,
      savedTotalAmount: order.totalAmount,
      itemsCount: order.items.length
    });

    // Add to queue
    await queueService.addToQueue(wholesalerShopId, order);

    // Generate payment data with QR code
    const paymentData = await upiService.generatePaymentData(
      wholesalerShop.upiId,
      wholesalerShop.name,
      totalAmount
    );

    // Emit real-time events
    socketService.emitNewOrder(wholesalerShopId, {
      orderId: order._id,
      retailerId: retailerId,
      retailerName: retailerShop.name,
      totalAmount,
      queuePosition: order.queuePosition
    });

    logger.success('Order creation complete with payment data', {
      orderId: order._id,
      amount: totalAmount
    });

    res.status(201).json({
      message: 'Order created successfully',
      order,
      paymentData
    });
  } catch (error) {
    logger.error('Error creating order', {
      error: error.message,
      retailerId: req.user.userId,
      stack: error.stack
    });
    res.status(500).json({ message: 'Error creating order', error: error.message });
  }
};

/**
 * Get order queue for wholesaler
 */
exports.getOrderQueue = async (req, res) => {
  try {
    const wholesalerShopId = req.user.shopId;
    logger.debug('Fetching order queue', { wholesalerShopId });

    const queue = await queueService.getShopQueue(wholesalerShopId);
    res.json(queue);
  } catch (error) {
    logger.error('Error fetching order queue', { error: error.message });
    res.status(500).json({ message: 'Error fetching order queue', error: error.message });
  }
};

/**
 * Get retailer's orders
 */
exports.getRetailerOrders = async (req, res) => {
  try {
    const retailerId = req.user.userId;
    logger.debug('Fetching retailer orders', { retailerId });

    const orders = await queueService.getUserOrders(retailerId);
    res.json(orders);
  } catch (error) {
    logger.error('Error fetching retailer orders', { error: error.message });
    res.status(500).json({ message: 'Error fetching orders', error: error.message });
  }
};

/**
 * Update order status (for wholesaler)
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const wholesalerShopId = req.user.shopId;

    logger.debug('Updating order status', { orderId, status });

    // Verify order belongs to this wholesaler
    const order = await Order.findById(orderId);
    if (!order || order.wholesalerShop.toString() !== wholesalerShopId) {
      logger.warn('Unauthorized order update attempt', { orderId, wholesalerId: req.user.userId });
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const updatedOrder = await queueService.updateOrderStatus(orderId, status);
    res.json({ message: 'Order status updated', order: updatedOrder });
  } catch (error) {
    logger.error('Error updating order status', { error: error.message });
    res.status(500).json({ message: 'Error updating order status', error: error.message });
  }
};

/**
 * Confirm payment via UPI
 */
exports.confirmPayment = async (req, res) => {
  try {
    const { orderId, upiTransactionId } = req.body;
    const retailerId = req.user.userId;

    logger.debug('Confirming payment', { orderId, retailerId });

    // Verify order belongs to this retailer
    const order = await Order.findById(orderId);
    if (!order || order.retailer.toString() !== retailerId) {
      logger.warn('Unauthorized payment confirmation', { orderId, retailerId });
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const updatedOrder = await queueService.confirmPayment(orderId, upiTransactionId);

    res.json({
      message: 'Payment confirmed',
      order: updatedOrder
    });
  } catch (error) {
    logger.error('Error confirming payment', { error: error.message });
    res.status(500).json({ message: 'Error confirming payment', error: error.message });
  }
};

/**
 * Get queue statistics
 */
exports.getQueueStats = async (req, res) => {
  try {
    const wholesalerShopId = req.user.shopId;
    logger.debug('Getting queue statistics', { wholesalerShopId });

    const stats = await queueService.getQueueStats(wholesalerShopId);
    res.json(stats);
  } catch (error) {
    logger.error('Error getting queue statistics', { error: error.message });
    res.status(500).json({ message: 'Error getting statistics', error: error.message });
  }
};
