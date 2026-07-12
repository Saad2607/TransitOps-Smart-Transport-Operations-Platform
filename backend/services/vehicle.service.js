const { query } = require('../config/db');
const AppError = require('../utils/AppError');

const VEHICLE_COLUMNS = `
  id,
  registration_number,
  name_model,
  vehicle_type,
  max_load_capacity_kg,
  odometer_km,
  acquisition_cost,
  status,
  region,
  created_at,
  updated_at
`;

function mapVehicle(row) {
  if (!row) return null;

  return {
    id: row.id,
    registrationNumber: row.registration_number,
    nameModel: row.name_model,
    vehicleType: row.vehicle_type,
    maxLoadCapacityKg: Number(row.max_load_capacity_kg),
    odometerKm: Number(row.odometer_km),
    acquisitionCost: Number(row.acquisition_cost),
    status: row.status,
    region: row.region,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeRegistration(registrationNumber) {
  return registrationNumber?.trim().toUpperCase();
}

async function findRegistrationConflict(registrationNumber, excludeId = null) {
  const normalized = normalizeRegistration(registrationNumber);

  const { rows } = await query(
    `SELECT id, registration_number
       FROM vehicles
      WHERE UPPER(BTRIM(registration_number)) = $1
        AND ($2::INTEGER IS NULL OR id <> $2)
      LIMIT 1`,
    [normalized, excludeId]
  );

  return rows[0] || null;
}

async function list({ status, vehicleType, region } = {}) {
  const conditions = [];
  const params = [];

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  if (vehicleType) {
    params.push(vehicleType);
    conditions.push(`vehicle_type = $${params.length}`);
  }

  if (region) {
    params.push(region);
    conditions.push(`region = $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await query(
    `SELECT ${VEHICLE_COLUMNS}
       FROM vehicles
       ${whereClause}
      ORDER BY created_at DESC`,
    params
  );

  return rows.map(mapVehicle);
}

async function findById(id) {
  const { rows } = await query(
    `SELECT ${VEHICLE_COLUMNS} FROM vehicles WHERE id = $1 LIMIT 1`,
    [id]
  );

  return mapVehicle(rows[0]);
}

async function create(payload) {
  const {
    registrationNumber,
    nameModel,
    vehicleType,
    maxLoadCapacityKg,
    odometerKm = 0,
    acquisitionCost,
    status = 'Available',
    region = null,
  } = payload;

  if (!registrationNumber || !nameModel || !vehicleType || !maxLoadCapacityKg || acquisitionCost == null) {
    throw new AppError(
      'registrationNumber, nameModel, vehicleType, maxLoadCapacityKg, and acquisitionCost are required.',
      400
    );
  }

  if (Number(maxLoadCapacityKg) <= 0) {
    throw new AppError('maxLoadCapacityKg must be greater than 0.', 400);
  }

  const duplicate = await findRegistrationConflict(registrationNumber);
  if (duplicate) {
    throw new AppError(
      `Vehicle registration number "${normalizeRegistration(registrationNumber)}" is already taken.`,
      409,
      { existingVehicleId: duplicate.id }
    );
  }

  const { rows } = await query(
    `INSERT INTO vehicles (
      registration_number,
      name_model,
      vehicle_type,
      max_load_capacity_kg,
      odometer_km,
      acquisition_cost,
      status,
      region
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING ${VEHICLE_COLUMNS}`,
    [
      normalizeRegistration(registrationNumber),
      nameModel.trim(),
      vehicleType.trim(),
      maxLoadCapacityKg,
      odometerKm,
      acquisitionCost,
      status,
      region,
    ]
  );

  return mapVehicle(rows[0]);
}

async function update(id, payload) {
  const existing = await findById(id);
  if (!existing) {
    throw new AppError('Vehicle not found.', 404);
  }

  if (payload.registrationNumber) {
    const duplicate = await findRegistrationConflict(payload.registrationNumber, id);
    if (duplicate) {
      throw new AppError(
        `Vehicle registration number "${normalizeRegistration(payload.registrationNumber)}" is already taken.`,
        409,
        { existingVehicleId: duplicate.id }
      );
    }
  }

  const { rows } = await query(
    `UPDATE vehicles
        SET registration_number = COALESCE($2, registration_number),
            name_model = COALESCE($3, name_model),
            vehicle_type = COALESCE($4, vehicle_type),
            max_load_capacity_kg = COALESCE($5, max_load_capacity_kg),
            odometer_km = COALESCE($6, odometer_km),
            acquisition_cost = COALESCE($7, acquisition_cost),
            status = COALESCE($8, status),
            region = COALESCE($9, region),
            updated_at = NOW()
      WHERE id = $1
      RETURNING ${VEHICLE_COLUMNS}`,
    [
      id,
      payload.registrationNumber ? normalizeRegistration(payload.registrationNumber) : null,
      payload.nameModel?.trim() || null,
      payload.vehicleType?.trim() || null,
      payload.maxLoadCapacityKg ?? null,
      payload.odometerKm ?? null,
      payload.acquisitionCost ?? null,
      payload.status || null,
      payload.region ?? null,
    ]
  );

  return mapVehicle(rows[0]);
}

async function remove(id) {
  const existing = await findById(id);
  if (!existing) {
    throw new AppError('Vehicle not found.', 404);
  }

  try {
    await query('DELETE FROM vehicles WHERE id = $1', [id]);
  } catch (error) {
    if (error.code === '23503') {
      throw new AppError('Vehicle cannot be deleted because it is linked to trips or logs.', 409);
    }
    throw error;
  }

  return { message: 'Vehicle deleted successfully.' };
}

module.exports = {
  list,
  findById,
  create,
  update,
  remove,
  findRegistrationConflict,
};
