const express = require('express');
const analyticsController = require('../controllers/analytics.controller');
const { ROLES, ALL_ROLES } = require('../config/roles');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

const ANALYTICS_ROLES = [ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST];

router.use(authenticate);

router.get(
  '/operations-summary',
  authorize(...ALL_ROLES),
  asyncHandler(analyticsController.operationsSummary)
);

router.get(
  '/fuel-efficiency',
  authorize(...ANALYTICS_ROLES),
  asyncHandler(analyticsController.fuelEfficiency)
);

router.use(authorize(...ANALYTICS_ROLES));

router.get('/fleet-utilization', asyncHandler(analyticsController.fleetUtilization));
router.get('/fleet-utilization/current', asyncHandler(analyticsController.fleetUtilizationCurrent));
router.get('/vehicle-roi', asyncHandler(analyticsController.vehicleRoi));
router.get('/dashboard', asyncHandler(analyticsController.dashboardKpis));

module.exports = router;
