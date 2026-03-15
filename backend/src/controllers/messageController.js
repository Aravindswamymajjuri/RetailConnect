const Message = require('../models/Message');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

/**
 * Send a message
 */
exports.sendMessage = async (req, res) => {
  try {
    const { recipient, text } = req.body;
    const sender = req.user.userId;

    if (!recipient || !text) {
      return res.status(400).json({ message: 'Recipient and message text required' });
    }

    logger.debug('Creating message', { sender, recipient, textLength: text.length });

    // Ensure recipient is a valid ObjectId
    const recipientObjectId = mongoose.Types.ObjectId.isValid(recipient) ? new mongoose.Types.ObjectId(recipient) : recipient;

    const message = await Message.create({
      sender,
      recipient: recipientObjectId,
      text,
      timestamp: new Date()
    });

    logger.debug('Message created', { 
      messageId: message._id.toString(), 
      sender: sender, 
      recipient: recipientObjectId.toString(),
      text: message.text
    });

    // Emit real-time event
    const { getIO } = require('../services/socket');
    const io = getIO();
    
    // Emit to recipient - use string format for socket room name
    const recipientString = recipientObjectId.toString ? recipientObjectId.toString() : recipientObjectId;
    logger.debug('Emitting message to socket room', { room: `user:${recipientString}` });
    
    io.to(`user:${recipientString}`).emit('messageReceived', {
      _id: message._id,
      sender: message.sender,
      text: message.text,
      timestamp: message.timestamp
    });

    logger.success('Message sent', { 
      from: sender, 
      to: recipientObjectId.toString(), 
      messageId: message._id.toString() 
    });
    res.json({ 
      message: 'Message sent',
      data: {
        _id: message._id,
        sender: message.sender,
        recipient: message.recipient,
        text: message.text,
        timestamp: message.timestamp
      }
    });
  } catch (error) {
    logger.error('Error sending message', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Error sending message', error: error.message });
  }
};

/**
 * Get messages between two users
 */
exports.getMessages = async (req, res) => {
  try {
    const { recipientId } = req.params;
    const userId = req.user.userId;
    
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    const recipientObjectId = mongoose.Types.ObjectId.isValid(recipientId) ? new mongoose.Types.ObjectId(recipientId) : recipientId;

    logger.debug('Fetching messages', { userId: userObjectId.toString(), recipientId: recipientObjectId.toString() });

    const messages = await Message.find({
      $or: [
        { sender: userObjectId, recipient: recipientObjectId },
        { sender: recipientObjectId, recipient: userObjectId }
      ]
    })
      .sort({ timestamp: 1 })
      .lean();

    logger.success('Messages retrieved', { count: messages.length, userId: userObjectId.toString(), recipientId: recipientObjectId.toString() });
    res.json(messages);
  } catch (error) {
    logger.error('Error fetching messages', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Error fetching messages', error: error.message });
  }
};

/**
 * Get all conversations for a user
 */
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    
    logger.debug('Fetching conversations for user', { userId, userObjectId: userObjectId.toString() });

    // First, check if there are any messages for this user
    const messageCount = await Message.countDocuments({
      $or: [
        { sender: userObjectId },
        { recipient: userObjectId }
      ]
    });
    logger.debug('Messages found for user', { messageCount });

    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: userObjectId },
            { recipient: userObjectId }
          ]
        }
      },
      {
        $sort: { timestamp: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', userObjectId] },
              '$recipient',
              '$sender'
            ]
          },
          lastMessage: { $first: '$text' },
          lastMessageTime: { $first: '$timestamp' }
        }
      },
      {
        $sort: { lastMessageTime: -1 }
      },
      {
        $limit: 50
      }
    ]);

    logger.success('Conversations retrieved', { count: conversations.length, userId: userId.toString() });
    logger.debug('Conversations data', { conversations: JSON.stringify(conversations) });
    res.json(conversations);
  } catch (error) {
    logger.error('Error fetching conversations', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Error fetching conversations', error: error.message });
  }
};
