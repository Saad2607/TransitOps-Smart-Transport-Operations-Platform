const express = require('express');
const vehicleController = require('../controllers/vehicle.controller');
const { ROLES } = require('../config/roles');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(authenticate);

router.get(
  '/',
  authorize(ROLES.FLEET_MANAGER, ROLES.DRIVER, ROLES.SAFETY_OFFICER, ROLES.FINANCIAL_ANALYST),
  asyncHandler(vehicleController.listVehicles)
);

router.get(
  '/:id',
  authorize(ROLES.FLEET_MANAGER, ROLES.DRIVER, ROLES.SAFETY_OFFICER, ROLES.FINANCIAL_ANALYST),
  asyncHandler(vehicleController.getVehicle)
);

router.post(
  '/',
  authorize(ROLES.FLEET_MANAGER),
  asyncHandler(vehicleController.createVehicle)
);

router.put(
  '/:id',
  authorize(ROLES.FLEET_MANAGER),
  asyncHandler(vehicleController.updateVehicle)
);

router.delete(
  '/:id',
  authorize(ROLES.FLEET_MANAGER),
  asyncHandler(vehicleController.deleteVehicle)
);

module.exports = router;
