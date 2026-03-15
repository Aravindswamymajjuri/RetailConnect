const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  retailer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  wholesaler: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        min: 1
      },
      pricePerUnit: {
        type: Number,
        required: true
      },
      total: {
        type: Number,
        required: true
      }
    }
  ],
  totalAmount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'checked_out', 'abandoned'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Update totalAmount when items change
cartSchema.pre('save', function(next) {
  this.totalAmount = this.items.reduce((sum, item) => sum + item.total, 0);
  next();
});

module.exports = mongoose.model('Cart', cartSchema);
