const jwt = require('jsonwebtoken');

const generateToken = (userId, role, shopId) => {
  return jwt.sign(
    { userId, role, shopId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

module.exports = { generateToken };
