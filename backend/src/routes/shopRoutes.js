const express = require('express');
const { getNearbyWholesaleShops, getShopProfile, updateShopStatus, getShopAnalytics } = require('../controllers/shopController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/nearby-wholesale', authMiddleware, getNearbyWholesaleShops);
router.get('/profile/:shopId', authMiddleware, getShopProfile);
router.put('/:shopId/status', authMiddleware, updateShopStatus);
router.get('/:shopId/analytics', authMiddleware, getShopAnalytics);

module.exports = router;
