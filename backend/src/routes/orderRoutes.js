const express = require('express');
const { 
  createOrder, 
  getOrderQueue, 
  updateOrderStatus, 
  confirmPayment, 
  getRetailerOrders,
  getQueueStats 
} = require('../controllers/orderController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// Retail routes
router.post('/', authMiddleware, roleMiddleware(['retail']), createOrder);
router.get('/my-orders', authMiddleware, roleMiddleware(['retail']), getRetailerOrders);
router.put('/:orderId/payment', authMiddleware, roleMiddleware(['retail']), confirmPayment);

// Wholesale routes
router.get('/queue', authMiddleware, roleMiddleware(['wholesale']), getOrderQueue);
router.get('/queue/stats', authMiddleware, roleMiddleware(['wholesale']), getQueueStats);
router.put('/:orderId/status', authMiddleware, roleMiddleware(['wholesale']), updateOrderStatus);

module.exports = router;
