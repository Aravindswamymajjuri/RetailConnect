const express = require('express');
const { registerRetail, registerWholesale, login, getCurrentUser } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Logging middleware for all auth routes
router.use((req, res, next) => {
  console.log(`\n🔵 [AUTH ROUTE] ${req.method} ${req.path}`);
  console.log('Request Headers:', req.headers);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Request Body Keys:', Object.keys(req.body));
  }
  next();
});

router.post('/register-retail', (req, res, next) => {
  console.log('➡️ Entering: register-retail endpoint');
  registerRetail(req, res, next);
});
router.post('/register-wholesale', (req, res, next) => {
  console.log('➡️ Entering: register-wholesale endpoint');
  registerWholesale(req, res, next);
});
router.post('/login', (req, res, next) => {
  console.log('➡️ Entering: login endpoint');
  login(req, res, next);
});
router.get('/me', authMiddleware, getCurrentUser);

module.exports = router;
