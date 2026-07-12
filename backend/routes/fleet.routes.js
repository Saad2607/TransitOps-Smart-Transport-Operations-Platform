const express = require('express');
const analyticsService = require('../services/analytics.service');
const { ROLES } = require('../config/roles');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(authenticate);

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
      message: `Use PATCH /api/drivers/${req.params.id}/suspend for driver suspension.`,
    });
  })
);

router.get(
  '/reports/operational-cost',
  authorize(ROLES.FINANCIAL_ANALYST, ROLES.FLEET_MANAGER),
  asyncHandler(async (req, res) => {
    const data = await analyticsService.getDashboardKpis({
      from: req.query.from,
      to: req.query.to,
    });

    res.json({
      success: true,
      data,
      message: 'Operational cost, fleet utilization, and vehicle ROI summary.',
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
