const KhataRecord = require('../models/KhataRecord');
const Order = require('../models/Order');

exports.getKhata = async (req, res) => {
  try {
    const khata = await KhataRecord.find({
      wholesaler: req.user.userId
    })
      .populate('retailer', 'name')
      .populate('retailerShop', 'name')
      .sort({ createdAt: -1 });

    res.json(khata);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching khata records', error: error.message });
  }
};

exports.getRetailerKhata = async (req, res) => {
  try {
    const khata = await KhataRecord.find({
      retailer: req.user.userId
    })
      .populate('wholesaler', 'name')
      .populate('wholesalerShop', 'name')
      .sort({ createdAt: -1 });

    res.json(khata);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching khata records', error: error.message });
  }
};
