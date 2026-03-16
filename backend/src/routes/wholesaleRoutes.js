const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const {
  getStockAlerts,
  getOrderQueue,
  updateOrderStatus,
  getSalesAnalytics,
  updateShopStatus,
  getKhataRecords,
  getReviews,
  migrateOrderInventory
} = require('../controllers/wholesaleController');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Stock alerts
router.get('/stock-alerts', getStockAlerts);

// Order queue
router.get('/order-queue', getOrderQueue);
router.put('/order-queue/:orderId/status', updateOrderStatus);

// Sales analytics
router.get('/analytics', getSalesAnalytics);

// Shop status
router.put('/shop-status', updateShopStatus);

// Khata records
router.get('/khata', getKhataRecords);

// Reviews
router.get('/reviews', getReviews);

// Migration endpoint (call once to process old orders)
router.post('/migrate-inventory', migrateOrderInventory);

module.exports = router;
