const express = require('express');
const analyticsService = require('../services/analytics.service');
const driverService = require('../services/driver.service');
const vehicleController = require('../controllers/vehicle.controller');
const driverController = require('../controllers/driver.controller');
const tripController = require('../controllers/trip.controller');
const fuelController = require('../controllers/fuel.controller');
const expenseController = require('../controllers/expense.controller');const { ROLES } = require('../config/roles');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(authenticate);

router.get(
  '/vehicles',
  authorize(ROLES.FLEET_MANAGER),
  asyncHandler(vehicleController.listVehicles)
);

router.post(  '/trips',
  authorize(ROLES.DRIVER, ROLES.FLEET_MANAGER),
  asyncHandler(tripController.createTrip)
);

router.patch(
  '/trips/:id/dispatch',
  authorize(ROLES.DRIVER, ROLES.FLEET_MANAGER),
  asyncHandler(tripController.dispatchTrip)
);

router.get(
  '/drivers/compliance',
  authorize(ROLES.SAFETY_OFFICER, ROLES.FLEET_MANAGER),
  asyncHandler(async (_req, res) => {
    const allDrivers = await driverService.list();
    const now = new Date();
    const soon = new Date(now);
    soon.setDate(soon.getDate() + 30);

    const expiredLicenses = allDrivers.filter((d) => d.isLicenseExpired);
    const expiringWithin30Days = allDrivers.filter((d) => {
      if (d.isLicenseExpired || d.status === 'Suspended') return false;
      const expiry = new Date(d.licenseExpiry);
      return expiry <= soon;
    });
    const suspendedDrivers = allDrivers.filter((d) => d.status === 'Suspended');

    res.json({
      success: true,
      data: {
        expiredLicenses,
        expiringWithin30Days,
        suspendedDrivers,
        summary: {
          expiredCount: expiredLicenses.length,
          expiringSoonCount: expiringWithin30Days.length,
          suspendedCount: suspendedDrivers.length,
        },
      },
      message: 'Driver compliance report.',
    });
  })
);

router.patch(
  '/drivers/:id/suspend',
  authorize(ROLES.SAFETY_OFFICER, ROLES.FLEET_MANAGER),
  asyncHandler(driverController.suspendDriver)
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
  asyncHandler(expenseController.createExpense)
);

router.post(
  '/fuel-logs',
  authorize(ROLES.FINANCIAL_ANALYST, ROLES.FLEET_MANAGER, ROLES.DRIVER),
  asyncHandler(fuelController.createFuelLog)
);

module.exports = router;
