/**
 * TransitOps — Phase 1 Authentication & RBAC Integration Tests
 * Role 4: Jay (Integration & QA)
 *
 * Usage:
 *   1. Start backend: cd backend && npm run dev
 *   2. Run tests:     node tests/phase1-auth.test.js
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

const ADMIN = {
  email: process.env.ADMIN_EMAIL || 'admin@transitops.local',
  password: process.env.ADMIN_PASSWORD || 'Admin@123',
};

const DRIVER = {
  email: process.env.DRIVER_EMAIL || 'driver1@transitops.local',
  password: process.env.DRIVER_PASSWORD || 'Driver@123',
  fullName: 'Alex Driver',
  roleName: 'Driver',
};

let adminToken = '';
let driverToken = '';

const results = [];

function log(icon, message) {
  console.log(`${icon} ${message}`);
}

async function api(method, path, { token, body, expectStatus } = {}) {
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

async function runTest(name, fn) {
  try {
    await fn();
    results.push({ name, passed: true });
    log('✅', name);
  } catch (error) {
    results.push({ name, passed: false, error: error.message });
    log('❌', `${name} — ${error.message}`);
  }
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

async function main() {
  console.log('\nTransitOps Phase 1 — Auth & RBAC Tests');
  console.log(`Target: ${BASE_URL}\n`);

  await runTest('GET /api/health returns 200', async () => {
    const response = await fetch(`${BASE_URL.replace(/\/api$/, '')}/api/health`);
    assertStatus(response.status, 200, 'health status');
  });

  await runTest('POST /auth/login rejects invalid credentials with 401', async () => {
    const { status } = await api('POST', '/auth/login', {
      body: { email: ADMIN.email, password: 'WrongPassword' },
    });
    assertStatus(status, 401, 'invalid login status');
  });

  await runTest('POST /auth/login returns JWT for admin', async () => {
    const { status, data } = await api('POST', '/auth/login', {
      body: { email: ADMIN.email, password: ADMIN.password },
    });

    assertStatus(status, 200, 'admin login status');
    assertTruthy(data.data?.token, 'admin token');
    assertTruthy(data.data?.user?.roleName, 'admin role');

    adminToken = data.data.token;
  });

  await runTest('GET /auth/me returns profile with valid token', async () => {
    const { status, data } = await api('GET', '/auth/me', { token: adminToken });
    assertStatus(status, 200, 'profile status');
    assertTruthy(data.data?.email, 'profile email');
  });

  await runTest('GET /auth/me blocks unauthenticated users with 401', async () => {
    const { status } = await api('GET', '/auth/me');
    assertStatus(status, 401, 'unauthenticated profile status');
  });

  await runTest('GET /auth/me blocks invalid token with 401', async () => {
    const { status } = await api('GET', '/auth/me', { token: 'invalid.jwt.token' });
    assertStatus(status, 401, 'invalid token profile status');
  });

  await runTest('GET /fleet/vehicles blocks unauthenticated users with 401', async () => {
    const { status } = await api('GET', '/fleet/vehicles');
    assertStatus(status, 401, 'unauthenticated fleet status');
  });

  await runTest('GET /fleet/vehicles allows Fleet Manager with 200', async () => {
    const { status } = await api('GET', '/fleet/vehicles', { token: adminToken });
    assertStatus(status, 200, 'fleet manager vehicles status');
  });

  await runTest('POST /auth/register blocks unauthenticated users with 401', async () => {
    const { status } = await api('POST', '/auth/register', {
      body: DRIVER,
    });
    assertStatus(status, 401, 'unauthenticated register status');
  });

  await runTest('POST /auth/register allows Fleet Manager to create Driver', async () => {
    const { status } = await api('POST', '/auth/register', {
      token: adminToken,
      body: DRIVER,
    });

    if (status !== 201 && status !== 409) {
      throw new Error(`register driver: expected 201 or 409, got ${status}`);
    }
  });

  await runTest('POST /auth/login returns JWT for Driver', async () => {
    const { status, data } = await api('POST', '/auth/login', {
      body: { email: DRIVER.email, password: DRIVER.password },
    });

    assertStatus(status, 200, 'driver login status');
    assertTruthy(data.data?.token, 'driver token');

    driverToken = data.data.token;
  });

  await runTest('GET /fleet/vehicles blocks Driver with 403', async () => {
    const { status } = await api('GET', '/fleet/vehicles', { token: driverToken });
    assertStatus(status, 403, 'driver vehicles status');
  });

  await runTest('POST /fleet/trips allows Driver with 201', async () => {
    const { status } = await api('POST', '/fleet/trips', { token: driverToken, body: {} });
    assertStatus(status, 201, 'driver create trip status');
  });

  await runTest('GET /fleet/reports/operational-cost blocks Driver with 403', async () => {
    const { status } = await api('GET', '/fleet/reports/operational-cost', {
      token: driverToken,
    });
    assertStatus(status, 403, 'driver reports status');
  });

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;

  console.log('\n----------------------------------------');
  console.log(`Results: ${passed} passed, ${failed} failed, ${results.length} total`);
  console.log('----------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\nTest runner crashed:', error.message);
  process.exit(1);
});
