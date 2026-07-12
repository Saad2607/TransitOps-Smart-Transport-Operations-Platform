const fuelService = require('../services/fuel.service');

async function listFuelLogs(req, res) {
  const logs = await fuelService.list({
    vehicleId: req.query.vehicleId ? Number(req.query.vehicleId) : undefined,
  });

  res.status(200).json({ success: true, data: logs });
}

async function createFuelLog(req, res) {
  const log = await fuelService.create(req.body, req.user.id);

  res.status(201).json({
    success: true,
    data: log,
    message: 'Fuel log recorded.',
  });
}

module.exports = {
  listFuelLogs,
  createFuelLog,
};
