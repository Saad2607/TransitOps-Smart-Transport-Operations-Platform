const express = require('express');
const fuelController = require('../controllers/fuel.controller');
const { ROLES } = require('../config/roles');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(authenticate);

const READ_ROLES = [ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST, ROLES.DRIVER];
const WRITE_ROLES = [ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST, ROLES.DRIVER];

router.get('/', authorize(...READ_ROLES), asyncHandler(fuelController.listFuelLogs));
router.post('/', authorize(...WRITE_ROLES), asyncHandler(fuelController.createFuelLog));

module.exports = router;
