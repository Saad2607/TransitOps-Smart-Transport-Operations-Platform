const jwt = require('jsonwebtoken');
const AppError = require('./AppError');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
const JWT_ISSUER = process.env.JWT_ISSUER || 'transitops-api';

function ensureJwtSecret() {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
}

function signToken(payload) {
  ensureJwtSecret();

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: JWT_ISSUER,
  });
}

function verifyToken(token) {
  ensureJwtSecret();

  try {
    return jwt.verify(token, JWT_SECRET, { issuer: JWT_ISSUER });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError('Token expired. Please log in again.', 401);
    }

    if (err.name === 'JsonWebTokenError') {
      throw new AppError('Invalid token.', 401);
    }

    throw err;
  }
}

module.exports = {
  signToken,
  verifyToken,
};
