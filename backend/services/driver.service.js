const { query } = require('../config/db');
const AppError = require('../utils/AppError');

const DRIVER_COLUMNS = `
  id,
  full_name,
  license_number,
  license_category,
  license_expiry,
  contact_number,
  safety_score,
  status,
  user_id,
  created_at,
  updated_at
`;

const ASSIGNABLE_STATUSES = ['Available', 'On Trip'];

function mapDriver(row) {
  if (!row) return null;

  return {
    id: row.id,
    fullName: row.full_name,
    licenseNumber: row.license_number,
    licenseCategory: row.license_category,
    licenseExpiry: row.license_expiry,
    contactNumber: row.contact_number,
    safetyScore: Number(row.safety_score),
    status: row.status,
    userId: row.user_id,
    isLicenseExpired: new Date(row.license_expiry) < new Date(new Date().toDateString()),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isLicenseExpired(licenseExpiry) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(licenseExpiry);
  expiry.setHours(0, 0, 0, 0);
  return expiry < today;
}

function assertDriverEligibleForAssignment(driver, action = 'assign') {
  if (!driver) {
    throw new AppError('Driver not found.', 404);
  }

  if (driver.status === 'Suspended') {
    throw new AppError(`Cannot ${action} driver "${driver.fullName}" because status is Suspended.`, 403);
  }

  if (isLicenseExpired(driver.license_expiry)) {
    throw new AppError(
      `Cannot ${action} driver "${driver.fullName}" because driving license expired on ${driver.license_expiry}.`,
      403
    );
  }
}

function validateDriverStatusTransition({ currentStatus, nextStatus, licenseExpiry }) {
  if (!nextStatus || nextStatus === currentStatus) {
    return;
  }

  if (nextStatus === 'Suspended') {
    return;
  }

  if (ASSIGNABLE_STATUSES.includes(nextStatus)) {
    if (isLicenseExpired(licenseExpiry)) {
      throw new AppError(
        'Cannot set driver to an assignable status because the driving license is expired.',
        403
      );
    }
  }
}

async function findLicenseConflict(licenseNumber, excludeId = null) {
  const { rows } = await query(
    `SELECT id, license_number
       FROM drivers
      WHERE UPPER(BTRIM(license_number)) = UPPER(BTRIM($1))
        AND ($2::INTEGER IS NULL OR id <> $2)
      LIMIT 1`,
    [licenseNumber, excludeId]
  );

  return rows[0] || null;
}

async function list({ status, expiringWithinDays } = {}) {
  const conditions = [];
  const params = [];

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  if (expiringWithinDays != null) {
    params.push(Number(expiringWithinDays));
    conditions.push(`license_expiry <= CURRENT_DATE + ($${params.length} || ' days')::INTERVAL`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await query(
    `SELECT ${DRIVER_COLUMNS}
       FROM drivers
       ${whereClause}
      ORDER BY created_at DESC`,
    params
  );

  return rows.map(mapDriver);
}

async function findById(id) {
  const { rows } = await query(
    `SELECT ${DRIVER_COLUMNS} FROM drivers WHERE id = $1 LIMIT 1`,
    [id]
  );

  return mapDriver(rows[0]);
}

async function getRawById(id) {
  const { rows } = await query(`SELECT ${DRIVER_COLUMNS} FROM drivers WHERE id = $1 LIMIT 1`, [id]);
  return rows[0] || null;
}

async function create(payload) {
  const {
    fullName,
    licenseNumber,
    licenseCategory,
    licenseExpiry,
    contactNumber,
    safetyScore = 100,
    status = 'Available',
    userId = null,
  } = payload;

  if (!fullName || !licenseNumber || !licenseCategory || !licenseExpiry || !contactNumber) {
    throw new AppError(
      'fullName, licenseNumber, licenseCategory, licenseExpiry, and contactNumber are required.',
      400
    );
  }

  if (status === 'Suspended') {
    throw new AppError('New drivers cannot be created with Suspended status.', 400);
  }

  validateDriverStatusTransition({
    currentStatus: null,
    nextStatus: status,
    licenseExpiry,
  });

  const duplicate = await findLicenseConflict(licenseNumber);
  if (duplicate) {
    throw new AppError(`Driver license number "${licenseNumber}" is already registered.`, 409, {
      existingDriverId: duplicate.id,
    });
  }

  const { rows } = await query(
    `INSERT INTO drivers (
      full_name,
      license_number,
      license_category,
      license_expiry,
      contact_number,
      safety_score,
      status,
      user_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING ${DRIVER_COLUMNS}`,
    [
      fullName.trim(),
      licenseNumber.trim(),
      licenseCategory.trim(),
      licenseExpiry,
      contactNumber.trim(),
      safetyScore,
      status,
      userId,
    ]
  );

  return mapDriver(rows[0]);
}

async function update(id, payload) {
  const existing = await getRawById(id);
  if (!existing) {
    throw new AppError('Driver not found.', 404);
  }

  const nextStatus = payload.status ?? existing.status;
  const nextLicenseExpiry = payload.licenseExpiry ?? existing.license_expiry;

  if (nextStatus === 'Suspended' && payload.status === undefined && payload.licenseExpiry) {
    validateDriverStatusTransition({
      currentStatus: existing.status,
      nextStatus: existing.status,
      licenseExpiry: nextLicenseExpiry,
    });
  } else {
    validateDriverStatusTransition({
      currentStatus: existing.status,
      nextStatus,
      licenseExpiry: nextLicenseExpiry,
    });
  }

  if (payload.licenseNumber) {
    const duplicate = await findLicenseConflict(payload.licenseNumber, id);
    if (duplicate) {
      throw new AppError(`Driver license number "${payload.licenseNumber}" is already registered.`, 409, {
        existingDriverId: duplicate.id,
      });
    }
  }

  if (payload.status && payload.status !== 'Suspended' && nextStatus !== 'Off Duty') {
    assertDriverEligibleForAssignment(
      {
        full_name: existing.full_name,
        license_expiry: nextLicenseExpiry,
        status: nextStatus,
      },
      'update'
    );
  }

  const { rows } = await query(
    `UPDATE drivers
        SET full_name = COALESCE($2, full_name),
            license_number = COALESCE($3, license_number),
            license_category = COALESCE($4, license_category),
            license_expiry = COALESCE($5, license_expiry),
            contact_number = COALESCE($6, contact_number),
            safety_score = COALESCE($7, safety_score),
            status = COALESCE($8, status),
            user_id = COALESCE($9, user_id),
            updated_at = NOW()
      WHERE id = $1
      RETURNING ${DRIVER_COLUMNS}`,
    [
      id,
      payload.fullName?.trim() || null,
      payload.licenseNumber?.trim() || null,
      payload.licenseCategory?.trim() || null,
      payload.licenseExpiry || null,
      payload.contactNumber?.trim() || null,
      payload.safetyScore ?? null,
      payload.status || null,
      payload.userId ?? null,
    ]
  );

  return mapDriver(rows[0]);
}

async function suspend(id) {
  return update(id, { status: 'Suspended' });
}

async function remove(id) {
  const existing = await findById(id);
  if (!existing) {
    throw new AppError('Driver not found.', 404);
  }

  try {
    await query('DELETE FROM drivers WHERE id = $1', [id]);
  } catch (error) {
    if (error.code === '23503') {
      throw new AppError('Driver cannot be deleted because they are linked to trips.', 409);
    }
    throw error;
  }

  return { message: 'Driver deleted successfully.' };
}

async function listEligibleForAssignment() {
  const { rows } = await query(
    `SELECT ${DRIVER_COLUMNS}
       FROM drivers
      WHERE status = 'Available'
        AND license_expiry >= CURRENT_DATE
      ORDER BY full_name ASC`
  );

  return rows.map(mapDriver);
}

module.exports = {
  list,
  findById,
  create,
  update,
  suspend,
  remove,
  listEligibleForAssignment,
  assertDriverEligibleForAssignment,
  isLicenseExpired,
};
