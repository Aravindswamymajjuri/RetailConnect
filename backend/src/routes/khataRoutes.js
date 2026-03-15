const express = require('express');
const { getKhata, getRetailerKhata } = require('../controllers/khataController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/wholesale', authMiddleware, roleMiddleware(['wholesale']), getKhata);
router.get('/retail', authMiddleware, roleMiddleware(['retail']), getRetailerKhata);

module.exports = router;
