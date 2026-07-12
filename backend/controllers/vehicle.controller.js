const vehicleService = require('../services/vehicle.service');

async function listVehicles(req, res) {
  const vehicles = await vehicleService.list({
    status: req.query.status,
    vehicleType: req.query.vehicleType,
    region: req.query.region,
  });

  res.status(200).json({ success: true, data: vehicles });
}

async function getVehicle(req, res) {
  const vehicle = await vehicleService.findById(Number(req.params.id));

  if (!vehicle) {
    return res.status(404).json({ success: false, message: 'Vehicle not found.' });
  }

  res.status(200).json({ success: true, data: vehicle });
}

async function createVehicle(req, res) {
  const vehicle = await vehicleService.create(req.body);

  res.status(201).json({ success: true, data: vehicle });
}

async function updateVehicle(req, res) {
  const vehicle = await vehicleService.update(Number(req.params.id), req.body);

  res.status(200).json({ success: true, data: vehicle });
}

async function deleteVehicle(req, res) {
  const result = await vehicleService.remove(Number(req.params.id));

  res.status(200).json({ success: true, data: result });
}

module.exports = {
  listVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
};
