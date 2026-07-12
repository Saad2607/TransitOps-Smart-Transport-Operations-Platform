const analyticsService = require('../services/analytics.service');

async function fleetUtilization(req, res) {
  const data = await analyticsService.getFleetUtilization({
    from: req.query.from,
    to: req.query.to,
  });

  res.status(200).json({ success: true, data });
}

async function fleetUtilizationCurrent(req, res) {
  const data = await analyticsService.getFleetUtilizationCurrent();

  res.status(200).json({ success: true, data });
}

async function vehicleRoi(req, res) {
  const data = await analyticsService.getVehicleRoi({
    from: req.query.from,
    to: req.query.to,
  });

  res.status(200).json({ success: true, data });
}

async function dashboardKpis(req, res) {
  const data = await analyticsService.getDashboardKpis({
    from: req.query.from,
    to: req.query.to,
  });

  res.status(200).json({ success: true, data });
}

async function operationsSummary(req, res) {
  const data = await analyticsService.getOperationsSummary({
    status: req.query.status,
    vehicleType: req.query.vehicleType,
    region: req.query.region,
  });

  res.status(200).json({ success: true, data });
}

async function fuelEfficiency(req, res) {
  const data = await analyticsService.getFuelEfficiency({
    from: req.query.from,
    to: req.query.to,
  });

  res.status(200).json({ success: true, data });
}

module.exports = {
  fleetUtilization,
  fleetUtilizationCurrent,
  vehicleRoi,
  dashboardKpis,
  operationsSummary,
  fuelEfficiency,
};
