const { query } = require('../config/db');
const AppError = require('../utils/AppError');

const FUEL_COLUMNS = `
  id,
  vehicle_id,
  trip_id,
  liters,
  cost,
  logged_at,
  odometer_km,
  created_by,
  created_at
`;

function mapFuelLog(row) {
  if (!row) return null;

  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    tripId: row.trip_id,
    liters: Number(row.liters),
    cost: Number(row.cost),
    loggedAt: row.logged_at,
    odometerKm: row.odometer_km != null ? Number(row.odometer_km) : null,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

async function list({ vehicleId } = {}) {
  const params = [];
  let whereClause = '';

  if (vehicleId) {
    params.push(vehicleId);
    whereClause = `WHERE vehicle_id = $1`;
  }

  const { rows } = await query(
    `SELECT ${FUEL_COLUMNS}
       FROM fuel_logs
       ${whereClause}
      ORDER BY logged_at DESC, created_at DESC`,
    params
  );

  return rows.map(mapFuelLog);
}

async function create(payload, createdBy) {
  const {
    vehicleId,
    tripId = null,
    liters,
    cost,
    loggedAt = null,
    odometerKm = null,
  } = payload;

  if (!vehicleId || !liters || cost == null) {
    throw new AppError('vehicleId, liters, and cost are required.', 400);
  }

  if (Number(liters) <= 0) {
    throw new AppError('liters must be greater than 0.', 400);
  }

  const { rows: vehicleRows } = await query(`SELECT id FROM vehicles WHERE id = $1`, [vehicleId]);
  if (!vehicleRows[0]) {
    throw new AppError('Vehicle not found.', 404);
  }

  const { rows } = await query(
    `INSERT INTO fuel_logs (vehicle_id, trip_id, liters, cost, logged_at, odometer_km, created_by)
     VALUES ($1, $2, $3, $4, COALESCE($5, CURRENT_DATE), $6, $7)
     RETURNING ${FUEL_COLUMNS}`,
    [vehicleId, tripId, liters, cost, loggedAt, odometerKm, createdBy]
  );

  return mapFuelLog(rows[0]);
}

module.exports = {
  list,
  create,
};
