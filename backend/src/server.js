require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const connectDB = require('./config/db');
const { initializeSocket } = require('./services/socket');
const logger = require('./utils/logger');
const { requestLogger } = require('./middleware/loggingMiddleware');

const authRoutes = require('./routes/authRoutes');
const shopRoutes = require('./routes/shopRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const cartRoutes = require('./routes/cartRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const khataRoutes = require('./routes/khataRoutes');
const adminRoutes = require('./routes/adminRoutes');
const messageRoutes = require('./routes/messageRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const wholesaleRoutes = require('./routes/wholesaleRoutes');

const app = express();
const server = http.createServer(app);
const io = initializeSocket(server);

// Startup logging
logger.separator('🚀 STARTUP');
logger.info('Starting backend server...');
logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware - logs all incoming requests
app.use(requestLogger);

// Connect to Database
logger.database('Connecting to MongoDB...');
connectDB().then(success => {
  if (!success) {
    logger.warn('⚠️  MongoDB connection failed. Some features may not work properly.');
    logger.warn('    Continuing server startup anyway...');
  }
}).catch(err => {
  logger.error('Unexpected database connection error:', err);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/khata', khataRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/wholesale', wholesaleRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Backend is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.separator('⚠️ ERROR CAUGHT');
  
  if (err.name === 'ValidationError') {
    logger.error('Validation Error:', err.message);
    return res.status(400).json({ 
      message: 'Validation failed',
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }

  if (err.name === 'CastError') {
    logger.error('Cast Error (Invalid ID):', err.message);
    return res.status(400).json({ 
      message: 'Invalid ID format',
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }

  if (err.name === 'JsonWebTokenError') {
    logger.error('JWT Error:', err.message);
    return res.status(401).json({ 
      message: 'Invalid token',
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }

  if (err.name === 'TokenExpiredError') {
    logger.error('Token Expired:', err.message);
    return res.status(401).json({ 
      message: 'Token expired',
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }

  // Generic error
  logger.error('Unhandled Error:', {
    message: err.message,
    name: err.name,
    status: err.statusCode || 500,
    route: req.path,
    method: req.method,
    stack: err.stack
  });

  res.status(err.statusCode || 500).json({ 
    message: 'Internal server error',
    error: err.message,
    timestamp: new Date().toISOString()
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.success(`Server running on http://localhost:${PORT}`);
  logger.success(`Socket.io ready for real-time connections`);
  logger.success(`API URL: http://localhost:${PORT}/api`);
  logger.info('Available Routes:');
  logger.info('  POST   /api/auth/register-retail');
  logger.info('  POST   /api/auth/register-wholesale');
  logger.info('  POST   /api/auth/login');
  logger.info('  GET    /api/auth/me');
  logger.separator();
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.warn('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

// Unhandled Promise Rejection
process.on('unhandledRejection', (reason, promise) => {
  logger.separator('🔴 UNHANDLED PROMISE REJECTION');
  logger.error('Unhandled Rejection at:', promise);
  logger.error('Reason:', reason);
});

// Uncaught Exception
process.on('uncaughtException', (error) => {
  logger.separator('🔴 UNCAUGHT EXCEPTION');
  logger.error('Uncaught Exception:', {
    name: error.name,
    message: error.message,
    stack: error.stack
  });
  process.exit(1);
});
