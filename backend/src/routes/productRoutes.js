const express = require('express');
const { createProduct, getShopProducts, updateProduct, deleteProduct } = require('../controllers/productController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/', authMiddleware, roleMiddleware(['wholesale']), createProduct);
router.get('/shop/:shopId', authMiddleware, getShopProducts);
router.put('/:productId', authMiddleware, roleMiddleware(['wholesale']), updateProduct);
router.delete('/:productId', authMiddleware, roleMiddleware(['wholesale']), deleteProduct);

module.exports = router;
