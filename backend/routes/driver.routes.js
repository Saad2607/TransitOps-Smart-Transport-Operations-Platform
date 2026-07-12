const express = require('express');
const driverController = require('../controllers/driver.controller');
const { ROLES } = require('../config/roles');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(authenticate);

router.get(
  '/eligible',
  authorize(ROLES.FLEET_MANAGER, ROLES.DRIVER),
  asyncHandler(driverController.listEligibleDrivers)
);

router.get(
  '/',
  authorize(ROLES.FLEET_MANAGER, ROLES.SAFETY_OFFICER),
  asyncHandler(driverController.listDrivers)
);

router.get(
  '/:id',
  authorize(ROLES.FLEET_MANAGER, ROLES.SAFETY_OFFICER),
  asyncHandler(driverController.getDriver)
);

router.post(
  '/',
  authorize(ROLES.FLEET_MANAGER),
  asyncHandler(driverController.createDriver)
);

router.put(
  '/:id',
  authorize(ROLES.FLEET_MANAGER),
  asyncHandler(driverController.updateDriver)
);

router.patch(
  '/:id/suspend',
  authorize(ROLES.FLEET_MANAGER, ROLES.SAFETY_OFFICER),
  asyncHandler(driverController.suspendDriver)
);

router.delete(
  '/:id',
  authorize(ROLES.FLEET_MANAGER),
  asyncHandler(driverController.deleteDriver)
);

module.exports = router;
