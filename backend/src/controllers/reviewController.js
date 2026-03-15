const Review = require('../models/Review');
const Shop = require('../models/Shop');
const { getIO } = require('../services/socket');
const logger = require('../utils/logger');

exports.createReview = async (req, res) => {
  try {
    // Accept both formats: (shop/shopId) and (comment/text)
    const { shop, shopId, rating, comment, text, orderId } = req.body;
    const finalShopId = shop || shopId;
    const finalComment = text || comment;

    logger.debug('Review submission', { 
      shop: finalShopId, 
      rating, 
      comment: finalComment,
      reviewer: req.user.userId 
    });

    if (!finalShopId || !rating || !finalComment) {
      return res.status(400).json({ message: 'Missing required fields: shop, rating, text' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const io = getIO();

    const review = new Review({
      reviewer: req.user.userId,
      shop: finalShopId,
      rating: Number(rating),
      comment: finalComment.trim(),
      order: orderId
    });

    logger.debug('Saving review to database', { reviewData: review });
    await review.save();
    logger.success('Review saved successfully', { reviewId: review._id });

    // Update shop rating
    const reviews = await Review.find({ shop: finalShopId });
    const averageRating = reviews.reduce((sum, rev) => sum + rev.rating, 0) / reviews.length;

    logger.debug('Updating shop rating', { 
      shopId: finalShopId, 
      averageRating, 
      totalReviews: reviews.length 
    });

    await Shop.findByIdAndUpdate(
      finalShopId,
      {
        averageRating,
        totalReviews: reviews.length
      },
      { new: true }
    );
    logger.success('Shop rating updated', { shopId: finalShopId, averageRating });

    // Emit real-time event
    io.to(`shop:${finalShopId}`).emit('newReview', {
      shopId: finalShopId,
      rating,
      averageRating
    });

    res.status(201).json({ message: 'Review created', review });
  } catch (error) {
    logger.error('Error creating review', { 
      error: error.message, 
      stack: error.stack,
      body: req.body 
    });
    console.error('Error creating review:', error);
    res.status(500).json({ message: 'Error creating review', error: error.message });
  }
};

exports.getShopReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ shop: req.params.shopId })
      .populate('reviewer', 'name')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reviews', error: error.message });
  }
};
