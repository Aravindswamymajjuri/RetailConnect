const Complaint = require('../models/Complaint');
const { getIO } = require('../services/socket');

exports.createComplaint = async (req, res) => {
  try {
    const { subject, title, description, category, orderId, shopId, priority } = req.body;
    const io = getIO();

    // Map title to subject if subject not provided
    const complaintSubject = subject || title;

    if (!complaintSubject || !description) {
      return res.status(400).json({ message: 'Subject/Title and description are required' });
    }

    const complaint = new Complaint({
      complainant: req.user.userId,
      subject: complaintSubject,
      description,
      order: orderId,
      shop: shopId,
      priority: priority || 'Medium'
    });

    await complaint.save();

    // Emit to admin room
    io.to('role:admin').emit('newComplaint', {
      complaintId: complaint._id,
      subject: complaintSubject,
      priority
    });

    res.status(201).json({ message: 'Complaint submitted', complaint });
  } catch (error) {
    console.error('Complaint creation error:', error);
    res.status(500).json({ message: 'Error creating complaint', error: error.message });
  }
};

exports.getAllComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate('complainant', 'name email')
      .populate('shop', 'name')
      .sort({ createdAt: -1 });

    res.json(complaints);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching complaints', error: error.message });
  }
};

exports.updateComplaintStatus = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const io = getIO();

    const complaint = await Complaint.findByIdAndUpdate(
      req.params.complaintId,
      {
        status,
        adminNotes,
        resolvedAt: status === 'Resolved' ? new Date() : null
      },
      { new: true }
    );

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Emit to complainant
    io.to(`user:${complaint.complainant}`).emit('complaintStatusUpdated', {
      complaintId: complaint._id,
      status
    });

    res.json({ message: 'Complaint status updated', complaint });
  } catch (error) {
    res.status(500).json({ message: 'Error updating complaint', error: error.message });
  }
};

exports.getUserComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ complainant: req.user.userId })
      .sort({ createdAt: -1 });

    res.json(complaints);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching complaints', error: error.message });
  }
};
