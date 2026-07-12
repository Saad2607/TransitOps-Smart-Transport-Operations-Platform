const express = require('express');
const authRoutes = require('./auth.routes');
const fleetRoutes = require('./fleet.routes');
const vehicleRoutes = require('./vehicle.routes');
const driverRoutes = require('./driver.routes');
const analyticsRoutes = require('./analytics.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/drivers', driverRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/fleet', fleetRoutes);

module.exports = router;
