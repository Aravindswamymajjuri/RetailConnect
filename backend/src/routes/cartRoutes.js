const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const cartController = require('../controllers/cartController');

const router = express.Router();

// Get cart
router.get('/:wholesalerId', authMiddleware, cartController.getCart);

// Add to cart
router.post('/:wholesalerId/add', authMiddleware, cartController.addToCart);

// Update cart item quantity
router.put('/:wholesalerId/items/:productId', authMiddleware, cartController.updateCartItem);

// Remove from cart
router.delete('/:wholesalerId/items/:productId', authMiddleware, cartController.removeFromCart);

// Clear cart
router.delete('/:wholesalerId', authMiddleware, cartController.clearCart);

module.exports = router;
