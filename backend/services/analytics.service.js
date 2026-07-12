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
  const [utilization, vehicles, current, fuelEfficiency] = await Promise.all([
    getFleetUtilization({ from, to }),
    getVehicleRoi({ from, to }),
    getFleetUtilizationCurrent(),
    getFuelEfficiency({ from, to }),
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
    fuelEfficiency,
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

async function getOperationsSummary({ status, vehicleType, region } = {}) {
  const conditions = [`v.status <> 'Retired'`];
  const params = [];

  if (status) {
    params.push(status);
    conditions.push(`v.status = $${params.length}`);
  }

  if (vehicleType) {
    params.push(vehicleType);
    conditions.push(`v.vehicle_type = $${params.length}`);
  }

  if (region) {
    params.push(region);
    conditions.push(`v.region = $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows: vehicleRows } = await query(
    `SELECT
       COUNT(*)::INT AS total_fleet,
       COUNT(*) FILTER (WHERE v.status = 'On Trip')::INT AS active_vehicles,
       COUNT(*) FILTER (WHERE v.status = 'Available')::INT AS available_vehicles,
       COUNT(*) FILTER (WHERE v.status = 'In Shop')::INT AS vehicles_in_maintenance
     FROM vehicles v
     ${whereClause}`,
    params
  );

  const { rows: tripRows } = await query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'Dispatched')::INT AS active_trips,
       COUNT(*) FILTER (WHERE status = 'Draft')::INT AS pending_trips
     FROM trips`
  );

  const { rows: driverRows } = await query(
    `SELECT
       COUNT(*) FILTER (WHERE status IN ('Available', 'On Trip'))::INT AS drivers_on_duty
     FROM drivers`
  );

  let utilizationPercent = 0;

  try {
    const current = await getFleetUtilizationCurrent();
    utilizationPercent = current.utilizationPercentOnTrip ?? 0;
  } catch {
    const v = vehicleRows[0] || {};
    utilizationPercent =
      v.total_fleet > 0
        ? Number(((v.active_vehicles / v.total_fleet) * 100).toFixed(1))
        : 0;
  }

  const v = vehicleRows[0] || {};
  const t = tripRows[0] || {};
  const d = driverRows[0] || {};

  return {
    activeVehicles: Number(v.active_vehicles || 0),
    availableVehicles: Number(v.available_vehicles || 0),
    vehiclesInMaintenance: Number(v.vehicles_in_maintenance || 0),
    activeTrips: Number(t.active_trips || 0),
    pendingTrips: Number(t.pending_trips || 0),
    driversOnDuty: Number(d.drivers_on_duty || 0),
    totalFleet: Number(v.total_fleet || 0),
    utilizationPercent,
  };
}

function mapFuelEfficiencyRow(row) {
  const totalDistanceKm = Number(row.total_distance_km || 0);
  const totalLiters = Number(row.total_liters || 0);

  return {
    vehicleId: row.vehicle_id,
    registrationNumber: row.registration_number,
    nameModel: row.name_model,
    totalDistanceKm,
    totalLiters,
    kmPerLiter: totalLiters > 0 ? Number((totalDistanceKm / totalLiters).toFixed(2)) : null,
    fuelCost: Number(row.fuel_cost || 0),
  };
}

async function getFuelEfficiency({ from, to } = {}) {
  const startDate = parseDateParam(from, 'from');
  const endDate = parseDateParam(to, 'to');

  const { rows } = await query(
    `WITH trip_distance AS (
       SELECT
         t.vehicle_id,
         SUM(COALESCE(t.actual_distance_km, t.planned_distance_km, 0)) AS total_distance_km
       FROM trips t
       WHERE t.status = 'Completed'
         AND t.vehicle_id IS NOT NULL
         AND ($1::DATE IS NULL OR t.updated_at::DATE >= $1::DATE)
         AND ($2::DATE IS NULL OR t.updated_at::DATE <= $2::DATE)
       GROUP BY t.vehicle_id
     ),
     fuel_usage AS (
       SELECT
         fl.vehicle_id,
         SUM(fl.liters) AS total_liters,
         SUM(fl.cost) AS fuel_cost
       FROM fuel_logs fl
       WHERE ($1::DATE IS NULL OR fl.logged_at >= $1::DATE)
         AND ($2::DATE IS NULL OR fl.logged_at <= $2::DATE)
       GROUP BY fl.vehicle_id
     )
     SELECT
       v.id AS vehicle_id,
       v.registration_number,
       v.name_model,
       COALESCE(td.total_distance_km, 0) AS total_distance_km,
       COALESCE(fu.total_liters, 0) AS total_liters,
       COALESCE(fu.fuel_cost, 0) AS fuel_cost
     FROM vehicles v
     LEFT JOIN trip_distance td ON td.vehicle_id = v.id
     LEFT JOIN fuel_usage fu ON fu.vehicle_id = v.id
     WHERE v.status <> 'Retired'
       AND (COALESCE(td.total_distance_km, 0) > 0 OR COALESCE(fu.total_liters, 0) > 0)
     ORDER BY v.registration_number`,
    [startDate, endDate]
  );

  const vehicles = rows.map(mapFuelEfficiencyRow);
  const fleetDistance = vehicles.reduce((sum, v) => sum + v.totalDistanceKm, 0);
  const fleetLiters = vehicles.reduce((sum, v) => sum + v.totalLiters, 0);

  return {
    fleet: {
      totalDistanceKm: Number(fleetDistance.toFixed(2)),
      totalLiters: Number(fleetLiters.toFixed(2)),
      kmPerLiter: fleetLiters > 0 ? Number((fleetDistance / fleetLiters).toFixed(2)) : null,
    },
    vehicles,
  };
}

module.exports = {
  getFleetUtilization,
  getFleetUtilizationCurrent,
  getVehicleRoi,
  getDashboardKpis,
  getOperationsSummary,
  getFuelEfficiency,
};
