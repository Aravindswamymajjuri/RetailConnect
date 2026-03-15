const express = require('express');
const {
  getAllUsers,
  approveUser,
  suspendUser,
  deleteUser,
  getPlatformAnalytics,
  getShopAnalytics,
  getRetailers,
  getWholesalers,
  getReviews,
  getComplaints,
  resolveComplaint,
  getPlatformStats
} = require('../controllers/adminController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// User management
router.get('/users', authMiddleware, roleMiddleware(['admin']), getAllUsers);
router.get('/retailers', authMiddleware, roleMiddleware(['admin']), getRetailers);
router.get('/wholesalers', authMiddleware, roleMiddleware(['admin']), getWholesalers);
router.put('/users/:userId/approve', authMiddleware, roleMiddleware(['admin']), approveUser);
router.put('/users/:userId/suspend', authMiddleware, roleMiddleware(['admin']), suspendUser);
router.delete('/users/:userId', authMiddleware, roleMiddleware(['admin']), deleteUser);

// Analytics
router.get('/analytics/platform', authMiddleware, roleMiddleware(['admin']), getPlatformAnalytics);
router.get('/analytics/shop/:shopId', authMiddleware, roleMiddleware(['admin']), getShopAnalytics);
router.get('/stats', authMiddleware, roleMiddleware(['admin']), getPlatformStats);

// Reviews and complaints
router.get('/reviews', authMiddleware, roleMiddleware(['admin']), getReviews);
router.get('/complaints', authMiddleware, roleMiddleware(['admin']), getComplaints);
router.put('/complaints/:complaintId/resolve', authMiddleware, roleMiddleware(['admin']), resolveComplaint);

module.exports = router;
