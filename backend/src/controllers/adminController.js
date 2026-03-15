const User = require('../models/User');
const Shop = require('../models/Shop');
const Order = require('../models/Order');
const Complaint = require('../models/Complaint');

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .populate('shopId')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
};

exports.approveUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isApproved: true },
      { new: true }
    );

    res.json({ message: 'User approved', user });
  } catch (error) {
    res.status(500).json({ message: 'Error approving user', error: error.message });
  }
};

exports.suspendUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isSuspended: true },
      { new: true }
    );

    res.json({ message: 'User suspended', user });
  } catch (error) {
    res.status(500).json({ message: 'Error suspending user', error: error.message });
  }
};

exports.getPlatformAnalytics = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const retailUsers = await User.countDocuments({ role: 'retail' });
    const wholesaleUsers = await User.countDocuments({ role: 'wholesale' });
    const totalOrders = await Order.countDocuments();
    const completedOrders = await Order.countDocuments({ status: 'Completed' });
    const totalComplaints = await Complaint.countDocuments();

    res.json({
      totalUsers,
      retailUsers,
      wholesaleUsers,
      totalOrders,
      completedOrders,
      totalComplaints
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching analytics', error: error.message });
  }
};

exports.getShopAnalytics = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.shopId);
    const orders = await Order.find({
      $or: [
        { wholesalerShop: req.params.shopId },
        { retailerShop: req.params.shopId }
      ]
    });

    const totalSales = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const completedOrders = orders.filter(o => o.status === 'Completed').length;

    res.json({
      shop,
      totalOrders: orders.length,
      completedOrders,
      totalSales,
      averageOrderValue: totalSales / orders.length || 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching shop analytics', error: error.message });
  }
};

// Get all retailers
exports.getRetailers = async (req, res) => {
  try {
    const retailers = await User.find({ role: 'retail' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(retailers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching retailers', error: error.message });
  }
};

// Get all wholesalers
exports.getWholesalers = async (req, res) => {
  try {
    const wholesalers = await User.find({ role: 'wholesale' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(wholesalers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching wholesalers', error: error.message });
  }
};

// Approve user
exports.approveUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isApproved: true },
      { new: true }
    ).select('-password');

    res.json({ message: 'User approved', user });
  } catch (error) {
    res.status(500).json({ message: 'Error approving user', error: error.message });
  }
};

// Suspend user
exports.suspendUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isSuspended: true },
      { new: true }
    ).select('-password');

    res.json({ message: 'User suspended', user });
  } catch (error) {
    res.status(500).json({ message: 'Error suspending user', error: error.message });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.userId);
    await Shop.deleteMany({ owner: req.params.userId });

    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user', error: error.message });
  }
};

// Get all reviews
exports.getReviews = async (req, res) => {
  try {
    const Review = require('../models/Review');
    const reviews = await Review.find()
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reviews', error: error.message });
  }
};

// Get all complaints
exports.getComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .sort({ createdAt: -1 });

    res.json(complaints);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching complaints', error: error.message });
  }
};

// Resolve complaint
exports.resolveComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findByIdAndUpdate(
      req.params.complaintId,
      { status: 'Resolved' },
      { new: true }
    );

    res.json({ message: 'Complaint resolved', complaint });
  } catch (error) {
    res.status(500).json({ message: 'Error resolving complaint', error: error.message });
  }
};

// Get platform stats
exports.getPlatformStats = async (req, res) => {
  try {
    const Review = require('../models/Review');
    
    const totalRetailers = await User.countDocuments({ role: 'retail' });
    const activeRetailers = await User.countDocuments({ role: 'retail', isApproved: true, isSuspended: false });
    const totalWholesalers = await User.countDocuments({ role: 'wholesale' });
    const activeWholesalers = await User.countDocuments({ role: 'wholesale', isApproved: true, isSuspended: false });
    
    const allOrders = await Order.find().select('totalAmount status');
    const totalRevenue = allOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalOrders = allOrders.length;
    
    // Get order status breakdown
    const orderStatus = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get top products
    const Order = require('../models/Order');
    const popularProducts = await Order.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalQuantity: { $sum: '$items.quantity' }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      totalRetailers,
      activeRetailers,
      totalWholesalers,
      activeWholesalers,
      totalRevenue,
      totalOrders,
      orders: orderStatus,
      popularProducts
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stats', error: error.message });
  }
};
