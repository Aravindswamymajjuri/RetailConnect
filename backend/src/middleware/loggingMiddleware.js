const logger = require('../utils/logger');

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;

  // Log incoming request
  logger.request(req.method, req.path);
  
  if (Object.keys(req.body).length > 0) {
    logger.debug('Request Body:', {
      path: req.path,
      body: req.body,
    });
  }

  if (req.query && Object.keys(req.query).length > 0) {
    logger.debug('Query Parameters:', req.query);
  }

  // Override send to log response
  res.send = function (data) {
    const duration = Date.now() - start;
    logger.response(req.method, req.path, res.statusCode, duration);

    if (res.statusCode >= 400) {
      logger.warn(`Response Status: ${res.statusCode}`, {
        path: req.path,
        status: res.statusCode,
        duration: `${duration}ms`,
      });
    }

    res.send = originalSend;
    return res.send(data);
  };

  next();
};

// Error catching middleware wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    logger.error('Unhandled Error in Route:', {
      route: req.path,
      method: req.method,
      message: err.message,
      stack: err.stack,
    });
    next(err);
  });
};

module.exports = {
  requestLogger,
  asyncHandler,
};
