const express = require('express');
const maintenanceController = require('../controllers/maintenance.controller');
const { ROLES } = require('../config/roles');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(authenticate);

const READ_ROLES = [ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST, ROLES.SAFETY_OFFICER];
const WRITE_ROLES = [ROLES.FLEET_MANAGER];

router.get('/', authorize(...READ_ROLES), asyncHandler(maintenanceController.listMaintenance));
router.post('/', authorize(...WRITE_ROLES), asyncHandler(maintenanceController.createMaintenance));
router.patch(
  '/:id/close',
  authorize(...WRITE_ROLES),
  asyncHandler(maintenanceController.closeMaintenance)
);

module.exports = router;
