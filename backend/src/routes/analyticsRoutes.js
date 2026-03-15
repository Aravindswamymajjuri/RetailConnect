const express = require('express');
const { getRetailAnalytics, getWholesaleAnalytics, getShopAnalytics, getExpenditureAnalytics } = require('../controllers/analyticsController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/retail', authMiddleware, getRetailAnalytics);
router.get('/wholesale', authMiddleware, getWholesaleAnalytics);
router.get('/expenditure', authMiddleware, getExpenditureAnalytics);
router.get('/shop/:shopId', authMiddleware, getShopAnalytics);

module.exports = router;
