const express = require('express');
const { createReview, getShopReviews } = require('../controllers/reviewController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/', authMiddleware, createReview);
router.get('/shop/:shopId', authMiddleware, getShopReviews);

module.exports = router;
