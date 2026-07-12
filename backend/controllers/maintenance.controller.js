const maintenanceService = require('../services/maintenance.service');

async function listMaintenance(req, res) {
  const records = await maintenanceService.list({
    vehicleId: req.query.vehicleId ? Number(req.query.vehicleId) : undefined,
    status: req.query.status,
  });

  res.status(200).json({ success: true, data: records });
}

async function createMaintenance(req, res) {
  const record = await maintenanceService.create(req.body, req.user.id);

  res.status(201).json({
    success: true,
    data: record,
    message: 'Maintenance logged. Vehicle moved to In Shop.',
  });
}

async function closeMaintenance(req, res) {
  const record = await maintenanceService.close(Number(req.params.id));

  res.status(200).json({
    success: true,
    data: record,
    message: 'Maintenance closed. Vehicle restored to Available.',
  });
}

module.exports = {
  listMaintenance,
  createMaintenance,
  closeMaintenance,
};
