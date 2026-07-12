/**
 * TransitOps — Phase 2 Asset CRUD & Edge-Case Integration Tests
 * Role 8: Jay (Integration & QA)
 *
 * Verifies the frontend-facing contract of Saad's vehicle & driver APIs:
 * the same status codes and messages that drive the UI error banners.
 *
 * Edge cases covered:
 *   - Duplicate vehicle registration number → 409 (exact + case/whitespace)
 *   - Duplicate driver license number       → 409
 *   - Expired driver license                → 403 on assignable statuses
 *   - Suspended-at-creation drivers         → 400
 *   - Missing required fields               → 400
 *   - Driver-role RBAC on vehicle writes    → 403
 *
 * Usage:
 *   1. Start backend: cd backend && npm run dev
 *   2. Run tests:     node tests/phase2-assets.test.js
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

const ADMIN = {
  email: process.env.ADMIN_EMAIL || 'admin@transitops.local',
  password: process.env.ADMIN_PASSWORD || 'Admin@123',
};

const DRIVER_USER = {
  email: process.env.DRIVER_EMAIL || 'driver1@transitops.local',
  password: process.env.DRIVER_PASSWORD || 'Driver@123',
  fullName: 'Alex Driver',
  roleName: 'Driver',
};

// Unique suffix so re-runs never collide with leftover data.
const RUN_ID = Date.now().toString(36).toUpperCase();

const PAST_DATE = '2020-01-01';
const FUTURE_DATE = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

let adminToken = '';
let driverToken = '';

const created = { vehicles: [], drivers: [] };
const results = [];

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

function assertMessageIncludes(data, fragment, label) {
  const message = (data?.message || '').toLowerCase();
  if (!message.includes(fragment.toLowerCase())) {
    throw new Error(`${label}: message "${data?.message}" should mention "${fragment}"`);
  }
}

function vehiclePayload(overrides = {}) {
  return {
    registrationNumber: `QA-${RUN_ID}-01`,
    nameModel: 'QA Test Van',
    vehicleType: 'Van',
    maxLoadCapacityKg: 800,
    odometerKm: 1000,
    acquisitionCost: 2075000,
    status: 'Available',
    region: 'QA',
    ...overrides,
  };
}

function driverPayload(overrides = {}) {
  return {
    fullName: `QA Driver ${RUN_ID}`,
    licenseNumber: `QA-DL-${RUN_ID}-01`,
    licenseCategory: 'LMV',
    licenseExpiry: FUTURE_DATE,
    contactNumber: '+91 9000000001',
    safetyScore: 95,
    status: 'Available',
    ...overrides,
  };
}

async function main() {
  console.log('\nTransitOps Phase 2 — Asset CRUD & Edge-Case Tests');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Run ID: ${RUN_ID}\n`);

  // ---------- Setup ----------

  await runTest('Setup: admin login returns JWT', async () => {
    const { status, data } = await api('POST', '/auth/login', {
      body: { email: ADMIN.email, password: ADMIN.password },
    });

    assertStatus(status, 200, 'admin login status');
    assertTruthy(data.data?.token, 'admin token');
    adminToken = data.data.token;
  });

  await runTest('Setup: driver account exists and can log in', async () => {
    // Idempotent: 201 on first run, 409 if the account already exists.
    const registration = await api('POST', '/auth/register', {
      token: adminToken,
      body: DRIVER_USER,
    });

    if (registration.status !== 201 && registration.status !== 409) {
      throw new Error(`driver register: expected 201 or 409, got ${registration.status}`);
    }

    const { status, data } = await api('POST', '/auth/login', {
      body: { email: DRIVER_USER.email, password: DRIVER_USER.password },
    });

    assertStatus(status, 200, 'driver login status');
    driverToken = data.data.token;
  });

  // ---------- Vehicle edge cases ----------

  await runTest('POST /vehicles creates a vehicle (201)', async () => {
    const { status, data } = await api('POST', '/vehicles', {
      token: adminToken,
      body: vehiclePayload(),
    });

    assertStatus(status, 201, 'create vehicle status');
    assertTruthy(data.data?.id, 'created vehicle id');
    created.vehicles.push(data.data.id);
  });

  await runTest('POST /vehicles rejects exact duplicate registration (409)', async () => {
    const { status, data } = await api('POST', '/vehicles', {
      token: adminToken,
      body: vehiclePayload({ nameModel: 'Duplicate Attempt' }),
    });

    assertStatus(status, 409, 'duplicate vehicle status');
    assertMessageIncludes(data, 'already taken', 'duplicate vehicle');
    assertTruthy(data.details?.existingVehicleId, 'conflicting vehicle id in details');
  });

  await runTest(
    'POST /vehicles rejects case/whitespace registration variant (409)',
    async () => {
      const { status, data } = await api('POST', '/vehicles', {
        token: adminToken,
        body: vehiclePayload({ registrationNumber: `  qa-${RUN_ID.toLowerCase()}-01  ` }),
      });

      assertStatus(status, 409, 'normalized duplicate status');
      assertMessageIncludes(data, 'already taken', 'normalized duplicate');
    }
  );

  await runTest('POST /vehicles rejects missing required fields (400)', async () => {
    const { status } = await api('POST', '/vehicles', {
      token: adminToken,
      body: { registrationNumber: `QA-${RUN_ID}-INCOMPLETE` },
    });

    assertStatus(status, 400, 'missing fields status');
  });

  await runTest('PUT /vehicles/:id rejects update to a taken registration (409)', async () => {
    const second = await api('POST', '/vehicles', {
      token: adminToken,
      body: vehiclePayload({ registrationNumber: `QA-${RUN_ID}-02`, nameModel: 'QA Second Van' }),
    });

    assertStatus(second.status, 201, 'second vehicle status');
    created.vehicles.push(second.data.data.id);

    const { status, data } = await api('PUT', `/vehicles/${second.data.data.id}`, {
      token: adminToken,
      body: { registrationNumber: `QA-${RUN_ID}-01` },
    });

    assertStatus(status, 409, 'update conflict status');
    assertMessageIncludes(data, 'already taken', 'update conflict');
  });

  await runTest('POST /vehicles blocks Driver role (403)', async () => {
    const { status } = await api('POST', '/vehicles', {
      token: driverToken,
      body: vehiclePayload({ registrationNumber: `QA-${RUN_ID}-RBAC` }),
    });

    assertStatus(status, 403, 'driver-role create vehicle status');
  });

  // ---------- Driver edge cases ----------

  await runTest('POST /drivers creates a driver with a valid license (201)', async () => {
    const { status, data } = await api('POST', '/drivers', {
      token: adminToken,
      body: driverPayload(),
    });

    assertStatus(status, 201, 'create driver status');
    assertTruthy(data.data?.id, 'created driver id');

    if (data.data.isLicenseExpired !== false) {
      throw new Error('valid driver should have isLicenseExpired=false');
    }

    created.drivers.push(data.data.id);
  });

  await runTest('POST /drivers rejects duplicate license number (409)', async () => {
    const { status, data } = await api('POST', '/drivers', {
      token: adminToken,
      body: driverPayload({ fullName: 'Duplicate License Attempt' }),
    });

    assertStatus(status, 409, 'duplicate license status');
    assertMessageIncludes(data, 'already registered', 'duplicate license');
  });

  await runTest('POST /drivers flags expired license on Available status (403)', async () => {
    const { status, data } = await api('POST', '/drivers', {
      token: adminToken,
      body: driverPayload({
        licenseNumber: `QA-DL-${RUN_ID}-EXPIRED`,
        licenseExpiry: PAST_DATE,
        status: 'Available',
      }),
    });

    assertStatus(status, 403, 'expired license status');
    assertMessageIncludes(data, 'expired', 'expired license');
  });

  await runTest('POST /drivers allows expired license when Off Duty (201)', async () => {
    const { status, data } = await api('POST', '/drivers', {
      token: adminToken,
      body: driverPayload({
        fullName: `QA Expired Driver ${RUN_ID}`,
        licenseNumber: `QA-DL-${RUN_ID}-02`,
        licenseExpiry: PAST_DATE,
        status: 'Off Duty',
      }),
    });

    assertStatus(status, 201, 'off-duty expired driver status');

    if (data.data.isLicenseExpired !== true) {
      throw new Error('expired driver should have isLicenseExpired=true');
    }

    created.drivers.push(data.data.id);
  });

  await runTest(
    'PUT /drivers/:id blocks setting expired-license driver to Available (403)',
    async () => {
      const expiredDriverId = created.drivers[1];
      assertTruthy(expiredDriverId, 'expired driver id from previous test');

      const { status, data } = await api('PUT', `/drivers/${expiredDriverId}`, {
        token: adminToken,
        body: { status: 'Available' },
      });

      assertStatus(status, 403, 'activate expired driver status');
      assertMessageIncludes(data, 'expired', 'activate expired driver');
    }
  );

  await runTest('POST /drivers rejects Suspended status at creation (400)', async () => {
    const { status } = await api('POST', '/drivers', {
      token: adminToken,
      body: driverPayload({
        licenseNumber: `QA-DL-${RUN_ID}-SUSP`,
        status: 'Suspended',
      }),
    });

    assertStatus(status, 400, 'suspended-at-creation status');
  });

  await runTest('PATCH /drivers/:id/suspend suspends a driver (200)', async () => {
    const driverId = created.drivers[0];
    assertTruthy(driverId, 'driver id from previous test');

    const { status, data } = await api('PATCH', `/drivers/${driverId}/suspend`, {
      token: adminToken,
    });

    assertStatus(status, 200, 'suspend status');

    if (data.data.status !== 'Suspended') {
      throw new Error(`suspend: expected status Suspended, got ${data.data.status}`);
    }
  });

  await runTest('GET /drivers/eligible excludes suspended & expired drivers', async () => {
    const { status, data } = await api('GET', '/drivers/eligible', { token: adminToken });

    assertStatus(status, 200, 'eligible drivers status');

    const eligibleIds = (data.data || []).map((d) => d.id);
    for (const id of created.drivers) {
      if (eligibleIds.includes(id)) {
        throw new Error(`driver ${id} (suspended or expired) should not be dispatch-eligible`);
      }
    }
  });

  // ---------- Cleanup ----------

  await runTest('Cleanup: delete QA vehicles and drivers', async () => {
    for (const id of created.vehicles) {
      const { status } = await api('DELETE', `/vehicles/${id}`, { token: adminToken });
      assertStatus(status, 200, `delete vehicle ${id}`);
    }

    for (const id of created.drivers) {
      const { status } = await api('DELETE', `/drivers/${id}`, { token: adminToken });
      assertStatus(status, 200, `delete driver ${id}`);
    }
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
