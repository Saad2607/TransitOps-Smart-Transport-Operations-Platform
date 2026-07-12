const { query } = require('../config/db');
const AppError = require('../utils/AppError');

const MAINTENANCE_COLUMNS = `
  id,
  vehicle_id,
  title,
  description,
  cost,
  status,
  started_at,
  closed_at,
  created_by,
  created_at,
  updated_at
`;

function mapMaintenance(row) {
  if (!row) return null;

  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    title: row.title,
    description: row.description,
    cost: Number(row.cost),
    status: row.status,
    startedAt: row.started_at,
    closedAt: row.closed_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function list({ vehicleId, status } = {}) {
  const conditions = [];
  const params = [];

  if (vehicleId) {
    params.push(vehicleId);
    conditions.push(`vehicle_id = $${params.length}`);
  }

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await query(
    `SELECT ${MAINTENANCE_COLUMNS}
       FROM maintenance_logs
       ${whereClause}
      ORDER BY started_at DESC`,
    params
  );

  return rows.map(mapMaintenance);
}

async function findById(id) {
  const { rows } = await query(
    `SELECT ${MAINTENANCE_COLUMNS} FROM maintenance_logs WHERE id = $1 LIMIT 1`,
    [id]
  );

  return mapMaintenance(rows[0]);
}

async function create(payload, createdBy) {
  const { vehicleId, title, description = null, cost = 0 } = payload;

  if (!vehicleId || !title) {
    throw new AppError('vehicleId and title are required.', 400);
  }

  const { rows: vehicleRows } = await query(
    `SELECT id, registration_number, status FROM vehicles WHERE id = $1 LIMIT 1`,
    [vehicleId]
  );

  const vehicle = vehicleRows[0];
  if (!vehicle) {
    throw new AppError('Vehicle not found.', 404);
  }

  if (vehicle.status === 'Retired') {
    throw new AppError('Cannot log maintenance for a retired vehicle.', 403);
  }

  if (vehicle.status === 'On Trip') {
    throw new AppError(
      `Vehicle "${vehicle.registration_number}" is On Trip and cannot enter maintenance.`,
      409
    );
  }

  const { rows } = await query(
    `INSERT INTO maintenance_logs (vehicle_id, title, description, cost, status, created_by)
     VALUES ($1, $2, $3, $4, 'Active', $5)
     RETURNING ${MAINTENANCE_COLUMNS}`,
    [vehicleId, title.trim(), description, cost, createdBy]
  );

  return mapMaintenance(rows[0]);
}

async function close(id) {
  const existing = await findById(id);
  if (!existing) {
    throw new AppError('Maintenance record not found.', 404);
  }

  if (existing.status === 'Closed') {
    throw new AppError('Maintenance record is already closed.', 409);
  }

  const { rows } = await query(
    `UPDATE maintenance_logs
        SET status = 'Closed',
            closed_at = COALESCE(closed_at, NOW()),
            updated_at = NOW()
      WHERE id = $1
      RETURNING ${MAINTENANCE_COLUMNS}`,
    [id]
  );

  return mapMaintenance(rows[0]);
}

module.exports = {
  list,
  findById,
  create,
  close,
};
