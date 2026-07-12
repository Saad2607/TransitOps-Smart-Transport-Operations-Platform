const { ALL_ROLES } = require('../config/roles');
const AppError = require('../utils/AppError');

/**
 * Restrict a route to one or more TransitOps roles.
 *
 * Example:
 * router.post('/vehicles', authenticate, authorize(ROLES.FLEET_MANAGER), controller.create);
 */
function authorize(...allowedRoles) {
  const normalizedAllowedRoles = allowedRoles.flat();

  const invalidRoles = normalizedAllowedRoles.filter((role) => !ALL_ROLES.includes(role));
  if (invalidRoles.length > 0) {
    throw new Error(`RBAC misconfiguration. Unknown roles: ${invalidRoles.join(', ')}`);
  }

  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    if (!normalizedAllowedRoles.includes(req.user.roleName)) {
      return next(
        new AppError(`Access denied. Required role(s): ${normalizedAllowedRoles.join(' | ')}`, 403)
      );
    }

    next();
  };
}

module.exports = {
  authorize,
};
