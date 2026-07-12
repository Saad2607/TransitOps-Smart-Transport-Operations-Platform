const driverService = require('../services/driver.service');

async function listDrivers(req, res) {
  const drivers = await driverService.list({
    status: req.query.status,
    expiringWithinDays: req.query.expiringWithinDays,
  });

  res.status(200).json({ success: true, data: drivers });
}

async function getDriver(req, res) {
  const driver = await driverService.findById(Number(req.params.id));

  if (!driver) {
    return res.status(404).json({ success: false, message: 'Driver not found.' });
  }

  res.status(200).json({ success: true, data: driver });
}

async function createDriver(req, res) {
  const driver = await driverService.create(req.body);

  res.status(201).json({ success: true, data: driver });
}

async function updateDriver(req, res) {
  const driver = await driverService.update(Number(req.params.id), req.body);

  res.status(200).json({ success: true, data: driver });
}

async function suspendDriver(req, res) {
  const driver = await driverService.suspend(Number(req.params.id));

  res.status(200).json({
    success: true,
    data: driver,
    message: 'Driver suspended successfully.',
  });
}

async function deleteDriver(req, res) {
  const result = await driverService.remove(Number(req.params.id));

  res.status(200).json({ success: true, data: result });
}

async function listEligibleDrivers(req, res) {
  const drivers = await driverService.listEligibleForAssignment();

  res.status(200).json({ success: true, data: drivers });
}

module.exports = {
  listDrivers,
  getDriver,
  createDriver,
  updateDriver,
  suspendDriver,
  deleteDriver,
  listEligibleDrivers,
};
