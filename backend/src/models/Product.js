const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['sugar', 'rice', 'dal', 'oil', 'soap', 'other']
  },
  price: {
    type: Number,
    required: true
  },
  stockAvailable: {
    type: Number,
    required: true,
    default: 0
  },
  unit: {
    type: String,
    default: 'kg'
  },
  description: String,
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
