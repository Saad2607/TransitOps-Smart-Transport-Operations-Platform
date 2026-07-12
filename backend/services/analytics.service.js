const { query } = require('../config/db');
const AppError = require('../utils/AppError');

function parseDateParam(value, label) {
  if (value == null || value === '') return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(`Invalid ${label} date. Use ISO format YYYY-MM-DD.`, 400);
  }

  return value;
}

function mapUtilizationRow(row) {
  return {
    activeFleet: Number(row.active_fleet),
    utilizedVehicles: Number(row.utilized_vehicles),
    totalTripSeconds: Number(row.total_trip_seconds),
    periodSeconds: Number(row.period_seconds),
    utilizationPercent: Number(row.utilization_percent),
  };
}

function mapUtilizationCurrent(row) {
  return {
    activeFleet: Number(row.active_fleet),
    onTripNow: Number(row.on_trip_now),
    availableNow: Number(row.available_now),
    inShopNow: Number(row.in_shop_now),
    vehiclesWithCompletedTrips30d: Number(row.vehicles_with_completed_trips_30d),
    utilizationPercentOnTrip: Number(row.utilization_percent_on_trip),
    utilizationPercent30dActivity: Number(row.utilization_percent_30d_activity),
  };
}

function mapRoiRow(row) {
  return {
    vehicleId: row.vehicle_id,
    registrationNumber: row.registration_number,
    nameModel: row.name_model,
    acquisitionCost: Number(row.acquisition_cost),
    totalRevenue: Number(row.total_revenue),
    fuelCost: Number(row.fuel_cost),
    maintenanceCost: Number(row.maintenance_cost),
    netProfit: Number(row.net_profit),
    roiPercent: row.roi_percent != null ? Number(row.roi_percent) : null,
    completedTrips: Number(row.completed_trips),
  };
}

async function getFleetUtilization({ from, to } = {}) {
  const startDate = parseDateParam(from, 'from');
  const endDate = parseDateParam(to, 'to');

  if (startDate && endDate && startDate > endDate) {
    throw new AppError('"from" date must be on or before "to" date.', 400);
  }

  const { rows } = await query(
    `SELECT *
       FROM get_fleet_utilization(
         COALESCE($1::DATE, (CURRENT_DATE - INTERVAL '30 days')::DATE),
         COALESCE($2::DATE, CURRENT_DATE)
       )`,
    [startDate, endDate]
  );

  return mapUtilizationRow(rows[0]);
}

async function getFleetUtilizationCurrent() {
  const { rows } = await query('SELECT * FROM fleet_utilization_current LIMIT 1');
  return mapUtilizationCurrent(rows[0]);
}

async function getVehicleRoi({ from, to } = {}) {
  const startDate = parseDateParam(from, 'from');
  const endDate = parseDateParam(to, 'to');

  if (startDate && endDate && startDate > endDate) {
    throw new AppError('"from" date must be on or before "to" date.', 400);
  }

  const { rows } = await query('SELECT * FROM get_vehicle_roi($1::DATE, $2::DATE)', [
    startDate,
    endDate,
  ]);

  return rows.map(mapRoiRow);
}

async function getDashboardKpis({ from, to } = {}) {
  const [utilization, vehicles, current] = await Promise.all([
    getFleetUtilization({ from, to }),
    getVehicleRoi({ from, to }),
    getFleetUtilizationCurrent(),
  ]);

  const roiValues = vehicles.filter((v) => v.roiPercent != null);
  const avgRoiPercent =
    roiValues.length > 0
      ? Number(
          (roiValues.reduce((sum, v) => sum + v.roiPercent, 0) / roiValues.length).toFixed(2)
        )
      : null;

  return {
    fleetUtilization: utilization,
    fleetUtilizationCurrent: current,
    vehicleRoi: vehicles,
    summary: {
      vehiclesTracked: vehicles.length,
      avgRoiPercent,
      fleetRevenue: Number(vehicles.reduce((sum, v) => sum + v.totalRevenue, 0).toFixed(2)),
      fleetOperatingCost: Number(
        vehicles.reduce((sum, v) => sum + v.fuelCost + v.maintenanceCost, 0).toFixed(2)
      ),
      fleetNetProfit: Number(vehicles.reduce((sum, v) => sum + v.netProfit, 0).toFixed(2)),
    },
  };
}

module.exports = {
  getFleetUtilization,
  getFleetUtilizationCurrent,
  getVehicleRoi,
  getDashboardKpis,
};
