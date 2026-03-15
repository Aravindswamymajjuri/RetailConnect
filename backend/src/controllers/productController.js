const Product = require('../models/Product');
const { getIO } = require('../services/socket');
const logger = require('../utils/logger');

exports.createProduct = async (req, res) => {
  try {
    const { name, category, price, stockAvailable, unit, description } = req.body;

    logger.debug('Creating product', {
      name,
      category,
      shopId: req.user.shopId
    });

    const product = new Product({
      shop: req.user.shopId,
      name,
      category,
      price,
      stockAvailable,
      unit,
      description
    });

    await product.save();
    
    logger.success('Product created successfully', {
      productId: product._id,
      name: product.name,
      shopId: product.shop
    });

    // Emit real-time event to all retailers
    try {
      const io = getIO();
      io.emit('inventoryUpdated', {
        shopId: req.user.shopId,
        action: 'productAdded',
        product
      });
    } catch (socketError) {
      logger.warn('Socket.io not ready for product event', { error: socketError.message });
    }

    res.status(201).json({ message: 'Product created', product });
  } catch (error) {
    logger.error('Error creating product', {
      message: error.message,
      shopId: req.user.shopId,
      stack: error.stack
    });
    res.status(500).json({ message: 'Error creating product', error: error.message });
  }
};

exports.getShopProducts = async (req, res) => {
  try {
    const { shopId } = req.params;

    logger.debug('Fetching products for shop', { shopId });

    // Validate shopId is a valid ObjectId
    if (!shopId || shopId === '[object Object]' || !shopId.match(/^[0-9a-fA-F]{24}$/)) {
      logger.error('Invalid shopId provided', { shopId });
      return res.status(400).json({ 
        message: 'Invalid shop ID',
        receivedShopId: shopId
      });
    }

    const products = await Product.find({ shop: shopId, isActive: true });
    
    logger.success('Products fetched successfully', {
      shopId,
      count: products.length
    });

    res.json(products);
  } catch (error) {
    logger.error('Error fetching products', {
      shopId: req.params.shopId,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    logger.debug('Updating product', { productId });

    const product = await Product.findByIdAndUpdate(
      productId,
      req.body,
      { new: true }
    );

    if (!product) {
      logger.warn('Product not found', { productId });
      return res.status(404).json({ message: 'Product not found' });
    }

    logger.success('Product updated successfully', { productId, name: product.name });

    // Emit real-time event to all retailers
    try {
      const io = getIO();
      io.emit('inventoryUpdated', {
        shopId: product.shop,
        action: 'productUpdated',
        product
      });
    } catch (socketError) {
      logger.warn('Socket.io not ready for product event', { error: socketError.message });
    }

    res.json({ message: 'Product updated', product });
  } catch (error) {
    logger.error('Error updating product', {
      productId: req.params.productId,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: 'Error updating product', error: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    logger.debug('Deleting product', { productId });

    const product = await Product.findByIdAndUpdate(
      productId,
      { isActive: false },
      { new: true }
    );

    if (!product) {
      logger.warn('Product not found for deletion', { productId });
      return res.status(404).json({ message: 'Product not found' });
    }

    logger.success('Product deleted successfully', { productId, name: product.name });

    // Emit real-time event to all retailers
    try {
      const io = getIO();
      io.emit('inventoryUpdated', {
        shopId: product.shop,
        action: 'productDeleted',
        productId
      });
    } catch (socketError) {
      logger.warn('Socket.io not ready for product event', { error: socketError.message });
    }

    res.json({ message: 'Product deleted', product });
  } catch (error) {
    logger.error('Error deleting product', {
      productId: req.params.productId,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: 'Error deleting product', error: error.message });
  }
};
