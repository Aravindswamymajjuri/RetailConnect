const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Shop = require('../models/Shop');
const logger = require('../utils/logger');

/**
 * Cart Operations Controller
 */

exports.getCart = async (req, res) => {
  try {
    const { wholesalerId } = req.params;
    const retailerId = req.user.userId;

    logger.debug('Fetching cart', { retailerId, wholesalerId });

    const cart = await Cart.findOne({
      retailer: retailerId,
      wholesaler: wholesalerId,
      status: 'active'
    })
      .populate('items.product')
      .populate('wholesaler', 'name');

    if (!cart) {
      logger.warn('Cart not found', { retailerId, wholesalerId });
      return res.json({
        items: [],
        totalAmount: 0,
        message: 'Cart is empty'
      });
    }

    logger.success('Cart fetched', { cartItems: cart.items.length });
    res.json(cart);
  } catch (error) {
    logger.error('Error fetching cart', { error: error.message });
    res.status(500).json({ message: 'Error fetching cart', error: error.message });
  }
};

exports.addToCart = async (req, res) => {
  try {
    const { wholesalerId, productId, quantity } = req.body;
    const retailerId = req.user.userId;

    logger.debug('Adding to cart', { retailerId, wholesalerId, productId, quantity });

    // Validate quantity
    if (!quantity || quantity < 1) {
      return res.status(400).json({ message: 'Invalid quantity' });
    }

    // Get product details
    const product = await Product.findById(productId);
    if (!product) {
      logger.warn('Product not found', { productId });
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check stock
    if (product.stockAvailable < quantity) {
      logger.warn('Insufficient stock', { productId, requested: quantity, available: product.stockAvailable });
      return res.status(400).json({ 
        message: 'Insufficient stock',
        available: product.stockAvailable
      });
    }

    // Find or create cart
    let cart = await Cart.findOne({
      retailer: retailerId,
      wholesaler: wholesalerId,
      status: 'active'
    });

    if (!cart) {
      logger.debug('Creating new cart', { retailerId, wholesalerId });
      cart = new Cart({
        retailer: retailerId,
        wholesaler: wholesalerId,
        items: []
      });
    }

    // Check if product already in cart
    const existingItem = cart.items.find(
      (item) => item.product.toString() === productId
    );

    if (existingItem) {
      logger.debug('Updating existing cart item', { productId });
      existingItem.quantity += quantity;
      existingItem.total = existingItem.quantity * existingItem.pricePerUnit;
    } else {
      logger.debug('Adding new item to cart', { productId });
      cart.items.push({
        product: productId,
        quantity,
        pricePerUnit: product.price,
        total: quantity * product.price
      });
    }

    await cart.save();

    logger.success('Item added to cart', { 
      cartItems: cart.items.length, 
      totalAmount: cart.totalAmount 
    });

    res.status(201).json({
      message: 'Item added to cart',
      cart
    });
  } catch (error) {
    logger.error('Error adding to cart', { error: error.message });
    res.status(500).json({ message: 'Error adding to cart', error: error.message });
  }
};

exports.updateCartItem = async (req, res) => {
  try {
    const { wholesalerId, productId } = req.params;
    const { quantity } = req.body;
    const retailerId = req.user.userId;

    logger.debug('Updating cart item', { retailerId, productId, quantity });

    if (!quantity || quantity < 1) {
      return res.status(400).json({ message: 'Invalid quantity' });
    }

    const cart = await Cart.findOne({
      retailer: retailerId,
      wholesaler: wholesalerId,
      status: 'active'
    });

    if (!cart) {
      logger.warn('Cart not found', { retailerId, wholesalerId });
      return res.status(404).json({ message: 'Cart not found' });
    }

    const item = cart.items.find((item) => item.product.toString() === productId);
    if (!item) {
      logger.warn('Item not in cart', { productId });
      return res.status(404).json({ message: 'Item not in cart' });
    }

    item.quantity = quantity;
    item.total = quantity * item.pricePerUnit;

    await cart.save();

    logger.success('Cart item updated', { productId, quantity });
    res.json({ message: 'Item updated', cart });
  } catch (error) {
    logger.error('Error updating cart item', { error: error.message });
    res.status(500).json({ message: 'Error updating cart item', error: error.message });
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    const { wholesalerId, productId } = req.params;
    const retailerId = req.user.userId;

    logger.debug('Removing from cart', { retailerId, productId });

    const cart = await Cart.findOne({
      retailer: retailerId,
      wholesaler: wholesalerId,
      status: 'active'
    });

    if (!cart) {
      logger.warn('Cart not found', { retailerId, wholesalerId });
      return res.status(404).json({ message: 'Cart not found' });
    }

    cart.items = cart.items.filter((item) => item.product.toString() !== productId);

    if (cart.items.length === 0) {
      logger.debug('Cart is now empty, marking as abandoned', { retailerId });
      cart.status = 'abandoned';
    }

    await cart.save();

    logger.success('Item removed from cart', { productId });
    res.json({ message: 'Item removed', cart });
  } catch (error) {
    logger.error('Error removing from cart', { error: error.message });
    res.status(500).json({ message: 'Error removing from cart', error: error.message });
  }
};

exports.clearCart = async (req, res) => {
  try {
    const { wholesalerId } = req.params;
    const retailerId = req.user.userId;

    logger.debug('Clearing cart', { retailerId, wholesalerId });

    const cart = await Cart.findOneAndUpdate(
      {
        retailer: retailerId,
        wholesaler: wholesalerId,
        status: 'active'
      },
      {
        items: [],
        status: 'abandoned'
      },
      { new: true }
    );

    logger.success('Cart cleared', { retailerId });
    res.json({ message: 'Cart cleared', cart });
  } catch (error) {
    logger.error('Error clearing cart', { error: error.message });
    res.status(500).json({ message: 'Error clearing cart', error: error.message });
  }
};
