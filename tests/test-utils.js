/**
 * Shared helpers for TransitOps integration test runners.
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@transitops.local';

/** Passwords to try when ADMIN_PASSWORD is not set (team may have changed from seed). */
const ADMIN_PASSWORD_FALLBACKS = ['Admin@123', 'Admin@456'];

function log(icon, message) {
  console.log(`${icon} ${message}`);
}

async function api(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  return { status: response.status, data };
}

async function assertBackendReachable() {
  try {
    const healthUrl = `${BASE_URL.replace(/\/api$/, '')}/api/health`;
    const response = await fetch(healthUrl);
    if (!response.ok) {
      throw new Error(`health check returned ${response.status}`);
    }
  } catch (error) {
    throw new Error(
      `Backend not reachable at ${BASE_URL}. Start it first: cd backend && npm run dev\n` +
        `  (${error.message})`
    );
  }
}

/**
 * Login as admin. Uses ADMIN_PASSWORD env var, then tries common seed passwords.
 * @returns {Promise<string>} JWT token
 */
async function loginAdmin() {
  const candidates = process.env.ADMIN_PASSWORD
    ? [process.env.ADMIN_PASSWORD]
    : ADMIN_PASSWORD_FALLBACKS;

  for (const password of candidates) {
    const { status, data } = await api('POST', '/auth/login', {
      body: { email: ADMIN_EMAIL, password },
    });

    if (status === 200 && data.data?.token) {
      if (!process.env.ADMIN_PASSWORD && password !== 'Admin@123') {
        log(
          '⚠️',
          `Logged in with "${password}" (seed default is Admin@123). Set ADMIN_PASSWORD to silence this.`
        );
      }
      return data.data.token;
    }
  }

  throw new Error(
    [
      'Admin login failed (401).',
      `  Email tried: ${ADMIN_EMAIL}`,
      '  Fix options:',
      '    1. set ADMIN_PASSWORD=YourPassword',
      '    2. Reset admin via backend: PATCH /api/auth/change-password after login',
      '    3. Re-run seed.sql (Admin@123)',
      '',
      '  Example:',
      '    set ADMIN_PASSWORD=Admin@456',
      '    node tests/phase3-trips.test.js',
    ].join('\n')
  );
}

function assertStatus(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertTruthy(value, label) {
  if (!value) {
    throw new Error(`${label}: expected truthy value`);
  }
}

function finish(results) {
  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;

  console.log('\n----------------------------------------');
  console.log(`Results: ${passed} passed, ${failed} failed, ${results.length} total`);
  console.log('----------------------------------------\n');

  if (failed > 0) {
    process.exitCode = 1;
  }
}

async function runTest(results, name, fn) {
  try {
    await fn();
    results.push({ name, passed: true });
    log('✅', name);
  } catch (error) {
    results.push({ name, passed: false, error: error.message });
    log('❌', `${name} — ${error.message}`);
  }
}

module.exports = {
  BASE_URL,
  ADMIN_EMAIL,
  log,
  api,
  assertBackendReachable,
  loginAdmin,
  assertStatus,
  assertTruthy,
  finish,
  runTest,
};
