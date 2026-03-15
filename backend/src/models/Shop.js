const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['retail', 'wholesale'],
    required: true
  },
  address: {
    type: String,
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
      // [longitude, latitude]
    }
  },
  category: String,
  gstNumber: String,
  upiId: String,
  openingTime: String,
  closingTime: String,
  isOpen: {
    type: Boolean,
    default: true
  },
  averageRating: {
    type: Number,
    default: 0
  },
  totalReviews: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Create geospatial index for location-based queries
shopSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Shop', shopSchema);
