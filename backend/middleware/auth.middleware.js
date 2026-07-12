const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken } = require('../utils/jwt');
const userService = require('../services/user.service');

/**
 * Validates Authorization: Bearer <token> and attaches the user to req.user.
 */
const authenticate = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Authentication required. Provide a valid Bearer token.', 401);
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  const user = await userService.findById(decoded.userId);

  if (!user || !user.is_active) {
    throw new AppError('User account is inactive or does not exist.', 401);
  }

  req.user = {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    roleId: user.role_id,
    roleName: user.role_name,
  };

  next();
});

module.exports = {
  authenticate,
};
