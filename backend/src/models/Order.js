const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  retailer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  retailerShop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  },
  wholesaler: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  wholesalerShop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
      },
      quantity: Number,
      price: Number,
      subtotal: Number
    }
  ],
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['Waiting', 'Preparing', 'Ready for Pickup', 'Completed', 'Cancelled'],
    default: 'Waiting'
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Completed', 'Failed'],
    default: 'Pending'
  },
  paymentMethod: {
    type: String,
    default: 'UPI'
  },
  upiTransactionId: String,
  queuePosition: Number,
  notes: String,
  completedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
