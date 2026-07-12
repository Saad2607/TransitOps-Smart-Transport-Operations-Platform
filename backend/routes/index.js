const express = require('express');
const authRoutes = require('./auth.routes');
const fleetRoutes = require('./fleet.routes');
const vehicleRoutes = require('./vehicle.routes');
const driverRoutes = require('./driver.routes');
const analyticsRoutes = require('./analytics.routes');
const tripRoutes = require('./trip.routes');
const maintenanceRoutes = require('./maintenance.routes');
const fuelRoutes = require('./fuel.routes');
const expenseRoutes = require('./expense.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/drivers', driverRoutes);
router.use('/trips', tripRoutes);
router.use('/maintenance', maintenanceRoutes);
router.use('/fuel-logs', fuelRoutes);
router.use('/expenses', expenseRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/fleet', fleetRoutes);

module.exports = router;
