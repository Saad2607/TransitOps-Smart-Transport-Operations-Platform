const express = require('express');
const tripController = require('../controllers/trip.controller');
const { ROLES } = require('../config/roles');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(authenticate);

const TRIP_READ_ROLES = [
  ROLES.FLEET_MANAGER,
  ROLES.DRIVER,
  ROLES.SAFETY_OFFICER,
  ROLES.FINANCIAL_ANALYST,
];

const TRIP_WRITE_ROLES = [ROLES.FLEET_MANAGER, ROLES.DRIVER];

router.get('/', authorize(...TRIP_READ_ROLES), asyncHandler(tripController.listTrips));
router.get('/:id', authorize(...TRIP_READ_ROLES), asyncHandler(tripController.getTrip));

router.post('/', authorize(...TRIP_WRITE_ROLES), asyncHandler(tripController.createTrip));
router.put('/:id', authorize(...TRIP_WRITE_ROLES), asyncHandler(tripController.updateTrip));

router.patch('/:id/dispatch', authorize(...TRIP_WRITE_ROLES), asyncHandler(tripController.dispatchTrip));
router.patch('/:id/complete', authorize(...TRIP_WRITE_ROLES), asyncHandler(tripController.completeTrip));
router.patch('/:id/cancel', authorize(...TRIP_WRITE_ROLES), asyncHandler(tripController.cancelTrip));

module.exports = router;
