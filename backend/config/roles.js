/**
 * TransitOps RBAC role constants.
 * These values must match the role names seeded in database/seed.sql.
 */
const ROLES = Object.freeze({
  FLEET_MANAGER: 'Fleet Manager',
  DRIVER: 'Driver',
  SAFETY_OFFICER: 'Safety Officer',
  FINANCIAL_ANALYST: 'Financial Analyst',
});

const ALL_ROLES = Object.values(ROLES);

module.exports = {
  ROLES,
  ALL_ROLES,
};
