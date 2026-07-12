/**
 * TransitOps — Trip lifecycle state machine.
 * Role 10: Saad — Draft → Dispatched → Completed | Cancelled
 */

const AppError = require('../utils/AppError');
const { withTransaction } = require('../config/db');
const driverService = require('./driver.service');

const TRIP_STATUS = Object.freeze({
  DRAFT: 'Draft',
  DISPATCHED: 'Dispatched',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
});

const ACTIVE_TRIP_STATUSES = [TRIP_STATUS.DRAFT, TRIP_STATUS.DISPATCHED];

const ALLOWED_TRANSITIONS = Object.freeze({
  [TRIP_STATUS.DRAFT]: [TRIP_STATUS.DISPATCHED, TRIP_STATUS.CANCELLED],
  [TRIP_STATUS.DISPATCHED]: [TRIP_STATUS.COMPLETED, TRIP_STATUS.CANCELLED],
  [TRIP_STATUS.COMPLETED]: [],
  [TRIP_STATUS.CANCELLED]: [],
});

const TRIP_COLUMNS = `
  id,
  source,
  destination,
  vehicle_id,
  driver_id,
  cargo_weight_kg,
  planned_distance_km,
  actual_distance_km,
  final_odometer_km,
  fuel_consumed_liters,
  revenue,
  status,
  dispatched_at,
  completed_at,
  cancelled_at,
  created_by,
  created_at,
  updated_at
`;

function mapTrip(row) {
  if (!row) return null;

  return {
    id: row.id,
    source: row.source,
    destination: row.destination,
    vehicleId: row.vehicle_id,
    driverId: row.driver_id,
    cargoWeightKg: Number(row.cargo_weight_kg),
    plannedDistanceKm: Number(row.planned_distance_km),
    actualDistanceKm: row.actual_distance_km != null ? Number(row.actual_distance_km) : null,
    finalOdometerKm: row.final_odometer_km != null ? Number(row.final_odometer_km) : null,
    fuelConsumedLiters: row.fuel_consumed_liters != null ? Number(row.fuel_consumed_liters) : null,
    revenue: row.revenue != null ? Number(row.revenue) : null,
    status: row.status,
    dispatchedAt: row.dispatched_at,
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function assertTransition(currentStatus, nextStatus) {
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];

  if (!allowed.includes(nextStatus)) {
    throw new AppError(
      `Invalid trip transition: ${currentStatus} → ${nextStatus}. Allowed: ${allowed.join(', ') || 'none'}.`,
      409
    );
  }
}

function mapPgError(err) {
  if (err.code === 'P0001') {
    throw new AppError(err.message, 400);
  }

  throw err;
}

async function getVehicleForAssignment(client, vehicleId, { tripId = null, forUpdate = false } = {}) {
  const lock = forUpdate ? 'FOR UPDATE' : '';

  const { rows } = await client.query(
    `SELECT id, registration_number, status, max_load_capacity_kg, odometer_km
       FROM vehicles
      WHERE id = $1
      ${lock}`,
    [vehicleId]
  );

  const vehicle = rows[0];
  if (!vehicle) {
    throw new AppError('Vehicle not found.', 404);
  }

  if (vehicle.status === 'Retired') {
    throw new AppError('Retired vehicles cannot be assigned to trips.', 403);
  }

  if (vehicle.status === 'In Shop') {
    throw new AppError(
      `Vehicle "${vehicle.registration_number}" is In Shop and cannot be dispatched.`,
      403
    );
  }

  if (vehicle.status === 'On Trip') {
    throw new AppError(
      `Vehicle "${vehicle.registration_number}" is already On Trip.`,
      409
    );
  }

  const { rows: conflicts } = await client.query(
    `SELECT id
       FROM trips
      WHERE vehicle_id = $1
        AND status = ANY($2::trip_status[])
        AND ($3::INTEGER IS NULL OR id <> $3)
      LIMIT 1`,
    [vehicleId, ACTIVE_TRIP_STATUSES, tripId]
  );

  if (conflicts.length > 0) {
    throw new AppError(
      `Vehicle "${vehicle.registration_number}" is already linked to active trip #${conflicts[0].id}.`,
      409
    );
  }

  return vehicle;
}

async function getDriverForAssignment(client, driverId, { tripId = null, forUpdate = false } = {}) {
  const lock = forUpdate ? 'FOR UPDATE' : '';

  const { rows } = await client.query(
    `SELECT id, full_name, status, license_expiry
       FROM drivers
      WHERE id = $1
      ${lock}`,
    [driverId]
  );

  const driver = rows[0];
  if (!driver) {
    throw new AppError('Driver not found.', 404);
  }

  driverService.assertDriverEligibleForAssignment(driver, 'assign');

  if (driver.status === 'On Trip') {
    throw new AppError(`Driver "${driver.full_name}" is already On Trip.`, 409);
  }

  const { rows: conflicts } = await client.query(
    `SELECT id
       FROM trips
      WHERE driver_id = $1
        AND status = ANY($2::trip_status[])
        AND ($3::INTEGER IS NULL OR id <> $3)
      LIMIT 1`,
    [driverId, ACTIVE_TRIP_STATUSES, tripId]
  );

  if (conflicts.length > 0) {
    throw new AppError(
      `Driver "${driver.full_name}" is already linked to active trip #${conflicts[0].id}.`,
      409
    );
  }

  return driver;
}

function assertCargoWithinCapacity(cargoWeightKg, vehicle, context = 'dispatch') {
  if (Number(cargoWeightKg) > Number(vehicle.max_load_capacity_kg)) {
    throw new AppError(
      `Cannot ${context}: cargo weight (${cargoWeightKg} kg) exceeds vehicle capacity (${vehicle.max_load_capacity_kg} kg).`,
      400
    );
  }
}

async function validateDraftAssignment(client, { vehicleId, driverId, cargoWeightKg, tripId = null }) {
  if (vehicleId) {
    const vehicle = await getVehicleForAssignment(client, vehicleId, { tripId });
    if (cargoWeightKg != null) {
      assertCargoWithinCapacity(cargoWeightKg, vehicle, 'assign vehicle');
    }
  }

  if (driverId) {
    await getDriverForAssignment(client, driverId, { tripId });
  }
}

async function list({ status, vehicleId, driverId } = {}) {
  const { query } = require('../config/db');
  const conditions = [];
  const params = [];

  if (status) {
    params.push(status);
    conditions.push(`t.status = $${params.length}`);
  }

  if (vehicleId) {
    params.push(vehicleId);
    conditions.push(`t.vehicle_id = $${params.length}`);
  }

  if (driverId) {
    params.push(driverId);
    conditions.push(`t.driver_id = $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await query(
    `SELECT ${TRIP_COLUMNS}
       FROM trips t
       ${whereClause}
      ORDER BY t.created_at DESC`,
    params
  );

  return rows.map(mapTrip);
}

async function findById(id) {
  const { query } = require('../config/db');
  const { rows } = await query(`SELECT ${TRIP_COLUMNS} FROM trips WHERE id = $1 LIMIT 1`, [id]);
  return mapTrip(rows[0]);
}

async function create(payload, createdBy) {
  const {
    source,
    destination,
    vehicleId = null,
    driverId = null,
    cargoWeightKg,
    plannedDistanceKm,
    actualDistanceKm = null,
    finalOdometerKm = null,
    fuelConsumedLiters = null,
    revenue = null,
  } = payload;

  if (!source || !destination || !cargoWeightKg || !plannedDistanceKm) {
    throw new AppError('source, destination, cargoWeightKg, and plannedDistanceKm are required.', 400);
  }

  if (Number(cargoWeightKg) <= 0 || Number(plannedDistanceKm) <= 0) {
    throw new AppError('cargoWeightKg and plannedDistanceKm must be greater than 0.', 400);
  }

  return withTransaction(async (client) => {
    await validateDraftAssignment(client, { vehicleId, driverId, cargoWeightKg });

    const { rows } = await client.query(
      `INSERT INTO trips (
         source,
         destination,
         vehicle_id,
         driver_id,
         cargo_weight_kg,
         planned_distance_km,
         actual_distance_km,
         final_odometer_km,
         fuel_consumed_liters,
         revenue,
         status,
         created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Draft', $11)
       RETURNING ${TRIP_COLUMNS}`,
      [
        source.trim(),
        destination.trim(),
        vehicleId,
        driverId,
        cargoWeightKg,
        plannedDistanceKm,
        actualDistanceKm,
        finalOdometerKm,
        fuelConsumedLiters,
        revenue,
        createdBy,
      ]
    );

    return mapTrip(rows[0]);
  }).catch(mapPgError);
}

async function update(id, payload) {
  return withTransaction(async (client) => {
    const { rows: existingRows } = await client.query(
      `SELECT ${TRIP_COLUMNS} FROM trips WHERE id = $1 FOR UPDATE`,
      [id]
    );

    const existing = existingRows[0];
    if (!existing) {
      throw new AppError('Trip not found.', 404);
    }

    if (existing.status !== TRIP_STATUS.DRAFT) {
      throw new AppError('Only Draft trips can be updated.', 409);
    }

    const nextVehicleId = payload.vehicleId !== undefined ? payload.vehicleId : existing.vehicle_id;
    const nextDriverId = payload.driverId !== undefined ? payload.driverId : existing.driver_id;
    const nextCargo =
      payload.cargoWeightKg !== undefined ? payload.cargoWeightKg : existing.cargo_weight_kg;

    await validateDraftAssignment(client, {
      vehicleId: nextVehicleId,
      driverId: nextDriverId,
      cargoWeightKg: nextCargo,
      tripId: id,
    });

    const { rows } = await client.query(
      `UPDATE trips
          SET source = COALESCE($2, source),
              destination = COALESCE($3, destination),
              vehicle_id = COALESCE($4, vehicle_id),
              driver_id = COALESCE($5, driver_id),
              cargo_weight_kg = COALESCE($6, cargo_weight_kg),
              planned_distance_km = COALESCE($7, planned_distance_km),
              actual_distance_km = COALESCE($8, actual_distance_km),
              final_odometer_km = COALESCE($9, final_odometer_km),
              fuel_consumed_liters = COALESCE($10, fuel_consumed_liters),
              revenue = COALESCE($11, revenue),
              updated_at = NOW()
        WHERE id = $1
        RETURNING ${TRIP_COLUMNS}`,
      [
        id,
        payload.source?.trim() || null,
        payload.destination?.trim() || null,
        payload.vehicleId ?? null,
        payload.driverId ?? null,
        payload.cargoWeightKg ?? null,
        payload.plannedDistanceKm ?? null,
        payload.actualDistanceKm ?? null,
        payload.finalOdometerKm ?? null,
        payload.fuelConsumedLiters ?? null,
        payload.revenue ?? null,
      ]
    );

    return mapTrip(rows[0]);
  }).catch(mapPgError);
}

async function transition(id, nextStatus, payload = {}) {
  return withTransaction(async (client) => {
    const { rows: existingRows } = await client.query(
      `SELECT ${TRIP_COLUMNS} FROM trips WHERE id = $1 FOR UPDATE`,
      [id]
    );

    const existing = existingRows[0];
    if (!existing) {
      throw new AppError('Trip not found.', 404);
    }

    assertTransition(existing.status, nextStatus);

    if (nextStatus === TRIP_STATUS.DISPATCHED) {
      if (!existing.vehicle_id || !existing.driver_id) {
        throw new AppError('Vehicle and driver must be assigned before dispatch.', 400);
      }

      const vehicle = await getVehicleForAssignment(client, existing.vehicle_id, {
        tripId: id,
        forUpdate: true,
      });

      await getDriverForAssignment(client, existing.driver_id, {
        tripId: id,
        forUpdate: true,
      });

      assertCargoWithinCapacity(existing.cargo_weight_kg, vehicle, 'dispatch');

      if (vehicle.status !== 'Available') {
        throw new AppError(
          `Vehicle "${vehicle.registration_number}" must be Available to dispatch (current: ${vehicle.status}).`,
          403
        );
      }
    }

    if (nextStatus === TRIP_STATUS.COMPLETED) {
      if (payload.actualDistanceKm == null && existing.actual_distance_km == null) {
        throw new AppError('actualDistanceKm is required to complete a trip.', 400);
      }
    }

    const { rows } = await client.query(
      `UPDATE trips
          SET status = $2::trip_status,
              actual_distance_km = COALESCE($3, actual_distance_km),
              final_odometer_km = COALESCE($4, final_odometer_km),
              fuel_consumed_liters = COALESCE($5, fuel_consumed_liters),
              revenue = COALESCE($6, revenue),
              updated_at = NOW()
        WHERE id = $1
        RETURNING ${TRIP_COLUMNS}`,
      [
        id,
        nextStatus,
        payload.actualDistanceKm ?? null,
        payload.finalOdometerKm ?? null,
        payload.fuelConsumedLiters ?? null,
        payload.revenue ?? null,
      ]
    );

    return mapTrip(rows[0]);
  }).catch(mapPgError);
}

async function dispatch(id) {
  return transition(id, TRIP_STATUS.DISPATCHED);
}

async function complete(id, payload = {}) {
  return transition(id, TRIP_STATUS.COMPLETED, payload);
}

async function cancel(id) {
  return transition(id, TRIP_STATUS.CANCELLED);
}

module.exports = {
  TRIP_STATUS,
  ALLOWED_TRANSITIONS,
  list,
  findById,
  create,
  update,
  dispatch,
  complete,
  cancel,
};
