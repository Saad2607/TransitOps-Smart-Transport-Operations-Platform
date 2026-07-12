const express = require('express');
const { ROLES } = require('../config/roles');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(authenticate);

router.get(
  '/vehicles',
  authorize(ROLES.FLEET_MANAGER),
  asyncHandler(async (_req, res) => {
    res.json({
      success: true,
      message: 'Fleet Manager: list all vehicles',
    });
  })
);

router.post(
  '/vehicles',
  authorize(ROLES.FLEET_MANAGER),
  asyncHandler(async (_req, res) => {
    res.status(201).json({
      success: true,
      message: 'Fleet Manager: create vehicle',
    });
  })
);

router.post(
  '/trips',
  authorize(ROLES.DRIVER, ROLES.FLEET_MANAGER),
  asyncHandler(async (_req, res) => {
    res.status(201).json({
      success: true,
      message: 'Driver/Fleet Manager: create trip',
    });
  })
);

router.patch(
  '/trips/:id/dispatch',
  authorize(ROLES.DRIVER, ROLES.FLEET_MANAGER),
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      message: `Driver/Fleet Manager: dispatch trip ${req.params.id}`,
    });
  })
);

router.get(
  '/drivers/compliance',
  authorize(ROLES.SAFETY_OFFICER, ROLES.FLEET_MANAGER),
  asyncHandler(async (_req, res) => {
    res.json({
      success: true,
      message: 'Safety Officer/Fleet Manager: driver compliance report',
    });
  })
);

router.patch(
  '/drivers/:id/suspend',
  authorize(ROLES.SAFETY_OFFICER, ROLES.FLEET_MANAGER),
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      message: `Safety Officer/Fleet Manager: suspend driver ${req.params.id}`,
    });
  })
);

router.get(
  '/reports/operational-cost',
  authorize(ROLES.FINANCIAL_ANALYST, ROLES.FLEET_MANAGER),
  asyncHandler(async (_req, res) => {
    res.json({
      success: true,
      message: 'Financial Analyst/Fleet Manager: operational cost report',
    });
  })
);

router.post(
  '/expenses',
  authorize(ROLES.FINANCIAL_ANALYST, ROLES.FLEET_MANAGER),
  asyncHandler(async (_req, res) => {
    res.status(201).json({
      success: true,
      message: 'Financial Analyst/Fleet Manager: record expense',
    });
  })
);

router.post(
  '/fuel-logs',
  authorize(ROLES.FINANCIAL_ANALYST, ROLES.FLEET_MANAGER, ROLES.DRIVER),
  asyncHandler(async (_req, res) => {
    res.status(201).json({
      success: true,
      message: 'Financial Analyst/Fleet Manager/Driver: record fuel log',
    });
  })
);

module.exports = router;
