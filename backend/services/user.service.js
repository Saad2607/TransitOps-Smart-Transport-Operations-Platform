const { query } = require('../config/db');

const USER_SELECT_WITH_PASSWORD = `
  SELECT
    u.id,
    u.email,
    u.password_hash,
    u.full_name,
    u.role_id,
    u.is_active,
    u.created_at,
    r.name AS role_name
  FROM users u
  INNER JOIN roles r ON r.id = u.role_id
`;

const USER_SELECT_PUBLIC = `
  SELECT
    u.id,
    u.email,
    u.full_name,
    u.role_id,
    u.is_active,
    u.created_at,
    r.name AS role_name
  FROM users u
  INNER JOIN roles r ON r.id = u.role_id
`;

async function findByEmail(email) {
  const { rows } = await query(
    `${USER_SELECT_WITH_PASSWORD} WHERE LOWER(u.email) = LOWER($1) LIMIT 1`,
    [email.trim()]
  );

  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await query(`${USER_SELECT_PUBLIC} WHERE u.id = $1 LIMIT 1`, [id]);

  return rows[0] || null;
}

async function findRoleByName(roleName) {
  const { rows } = await query('SELECT id, name FROM roles WHERE name = $1 LIMIT 1', [roleName]);

  return rows[0] || null;
}

async function createUser({ email, passwordHash, fullName, roleId }) {
  const { rows } = await query(
    `INSERT INTO users (email, password_hash, full_name, role_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [email.toLowerCase().trim(), passwordHash, fullName.trim(), roleId]
  );

  return findById(rows[0].id);
}

async function updatePassword(userId, passwordHash) {
  await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
    passwordHash,
    userId,
  ]);
}

module.exports = {
  findByEmail,
  findById,
  findRoleByName,
  createUser,
  updatePassword,
};
