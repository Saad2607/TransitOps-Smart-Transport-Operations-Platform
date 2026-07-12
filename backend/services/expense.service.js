const { query } = require('../config/db');
const AppError = require('../utils/AppError');

const EXPENSE_COLUMNS = `
  id,
  vehicle_id,
  trip_id,
  category,
  amount,
  description,
  expense_date,
  created_by,
  created_at
`;

function mapExpense(row) {
  if (!row) return null;

  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    tripId: row.trip_id,
    category: row.category,
    amount: Number(row.amount),
    description: row.description,
    expenseDate: row.expense_date,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

async function list({ vehicleId, category } = {}) {
  const conditions = [];
  const params = [];

  if (vehicleId) {
    params.push(vehicleId);
    conditions.push(`vehicle_id = $${params.length}`);
  }

  if (category) {
    params.push(category);
    conditions.push(`category = $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await query(
    `SELECT ${EXPENSE_COLUMNS}
       FROM expenses
       ${whereClause}
      ORDER BY expense_date DESC, created_at DESC`,
    params
  );

  return rows.map(mapExpense);
}

async function create(payload, createdBy) {
  const {
    vehicleId,
    tripId = null,
    category,
    amount,
    description = null,
    expenseDate = null,
  } = payload;

  if (!vehicleId || !category || amount == null) {
    throw new AppError('vehicleId, category, and amount are required.', 400);
  }

  const { rows: vehicleRows } = await query(`SELECT id FROM vehicles WHERE id = $1`, [vehicleId]);
  if (!vehicleRows[0]) {
    throw new AppError('Vehicle not found.', 404);
  }

  const { rows } = await query(
    `INSERT INTO expenses (vehicle_id, trip_id, category, amount, description, expense_date, created_by)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, CURRENT_DATE), $7)
     RETURNING ${EXPENSE_COLUMNS}`,
    [vehicleId, tripId, category, amount, description, expenseDate, createdBy]
  );

  return mapExpense(rows[0]);
}

module.exports = {
  list,
  create,
};
