const express = require('express');
const { createComplaint, getAllComplaints, updateComplaintStatus, getUserComplaints } = require('../controllers/complaintController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/', authMiddleware, createComplaint);
router.get('/', authMiddleware, roleMiddleware(['admin']), getAllComplaints);
router.get('/my-complaints', authMiddleware, getUserComplaints);
router.get('/my', authMiddleware, getUserComplaints);
router.put('/:complaintId/status', authMiddleware, roleMiddleware(['admin']), updateComplaintStatus);

module.exports = router;
