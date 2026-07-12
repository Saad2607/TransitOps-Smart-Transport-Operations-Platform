const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/auth.controller');
const { ROLES } = require('../config/roles');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many auth attempts. Try again later.',
  },
});

router.post('/login', authLimiter, asyncHandler(authController.login));

router.post(
  '/register',
  authenticate,
  authorize(ROLES.FLEET_MANAGER),
  asyncHandler(authController.register)
);

router.get('/me', authenticate, asyncHandler(authController.getMe));
router.patch('/change-password', authenticate, asyncHandler(authController.changePassword));

module.exports = router;
