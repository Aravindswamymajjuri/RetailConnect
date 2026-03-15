const express = require('express');
const { sendMessage, getMessages, getConversations } = require('../controllers/messageController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/', authMiddleware, sendMessage);
router.get('/conversations/list', authMiddleware, getConversations);
router.get('/:recipientId', authMiddleware, getMessages);

module.exports = router;
