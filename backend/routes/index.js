const express = require('express');
const authRoutes = require('./auth.routes');
const fleetRoutes = require('./fleet.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/fleet', fleetRoutes);

module.exports = router;
