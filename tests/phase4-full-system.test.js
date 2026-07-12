/**
 * TransitOps — Phase 4 Full-System E2E Integration Test
 * Role 12: Jay — connect booking form + analytics to transactional APIs
 *
 * PDF workflow:
 *   1. Register vehicle (500 kg, Available)
 *   2. Register driver (valid license)
 *   3. Create + dispatch trip → vehicle/driver On Trip
 *   4. Verify vehicle hidden from dispatch pool
 *   5. Complete trip → assets Available
 *   6. Log maintenance → vehicle In Shop, hidden from dispatch pool
 *   7. Analytics dashboard reflects operational data
 *
 * Usage:
 *   1. Start backend: cd backend && npm run dev
 *   2. Run tests:     node tests/phase4-full-system.test.js
 */

const {
  BASE_URL,
  log,
  api,
  assertBackendReachable,
  loginAdmin,
  assertStatus,
  assertTruthy,
  finish,
  runTest,
} = require('./test-utils');

const RUN_ID = Date.now().toString(36).toUpperCase();
const FUTURE_DATE = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

let adminToken = '';
let vehicleId = null;
let driverId = null;
let tripId = null;
let maintenanceId = null;

const results = [];

async function cleanup() {
  if (maintenanceId && adminToken) {
    await api('PATCH', `/maintenance/${maintenanceId}/close`, { token: adminToken });
  }

  if (vehicleId && adminToken) {
    await api('DELETE', `/vehicles/${vehicleId}`, { token: adminToken });
  }

  if (driverId && adminToken) {
    await api('DELETE', `/drivers/${driverId}`, { token: adminToken });
  }
}

async function main() {
  console.log('\nTransitOps Phase 4 — Full-System E2E Workflow');
  console.log(`Target: ${BASE_URL}\n`);

  await runTest(results, 'Setup: backend health check', async () => {
    await assertBackendReachable();
  });

  await runTest(results, 'Setup: admin login returns JWT', async () => {
    adminToken = await loginAdmin();
    assertTruthy(adminToken, 'admin token');
  });

  if (!adminToken) {
    finish(results);
    return;
  }

  await runTest(results, 'Step 1: register Van-05 style vehicle (500 kg, Available)', async () => {
    const { status, data } = await api('POST', '/vehicles', {
      token: adminToken,
      body: {
        registrationNumber: `VAN-QA-${RUN_ID}`,
        nameModel: 'Ford Transit QA',
        vehicleType: 'Van',
        maxLoadCapacityKg: 500,
        acquisitionCost: 2905000,
        status: 'Available',
        region: 'North',
      },
    });

    assertStatus(status, 201, 'create vehicle');
    assertTruthy(data.data?.id, 'vehicle id');
    if (data.data.status !== 'Available') throw new Error('expected Available vehicle');

    vehicleId = data.data.id;
  });

  await runTest(results, 'Step 2: register driver Alex with valid license', async () => {
    const { status, data } = await api('POST', '/drivers', {
      token: adminToken,
      body: {
        fullName: `Alex QA ${RUN_ID}`,
        licenseNumber: `DL-QA-${RUN_ID}`,
        licenseCategory: 'B',
        licenseExpiry: FUTURE_DATE,
        contactNumber: '+15550001234',
        status: 'Available',
      },
    });

    assertStatus(status, 201, 'create driver');
    assertTruthy(data.data?.id, 'driver id');
    if (data.data.isLicenseExpired) throw new Error('expected valid license');

    driverId = data.data.id;
  });

  if (!vehicleId || !driverId) {
    finish(results);
    return;
  }

  await runTest(results, 'Step 3: create trip with 450 kg cargo (201 Draft)', async () => {
    const { status, data } = await api('POST', '/trips', {
      token: adminToken,
      body: {
        source: `Warehouse North ${RUN_ID}`,
        destination: `Downtown Hub ${RUN_ID}`,
        vehicleId,
        driverId,
        cargoWeightKg: 450,
        plannedDistanceKm: 120,
      },
    });

    assertStatus(status, 201, 'create trip');
    assertTruthy(data.data?.id, 'trip id');
    if (data.data.status !== 'Draft') throw new Error('expected Draft');

    tripId = data.data.id;
  });

  if (!tripId) {
    await cleanup();
    finish(results);
    return;
  }

  await runTest(results, 'Step 4: dispatch trip → vehicle and driver instantly On Trip', async () => {
    const dispatch = await api('PATCH', `/trips/${tripId}/dispatch`, { token: adminToken });
    assertStatus(dispatch.status, 200, 'dispatch trip');

    const vehicle = await api('GET', `/vehicles/${vehicleId}`, { token: adminToken });
    const driver = await api('GET', `/drivers/${driverId}`, { token: adminToken });

    assertStatus(vehicle.status, 200, 'vehicle get');
    assertStatus(driver.status, 200, 'driver get');

    if (vehicle.data.data.status !== 'On Trip') {
      throw new Error(`vehicle expected On Trip, got ${vehicle.data.data.status}`);
    }

    if (driver.data.data.status !== 'On Trip') {
      throw new Error(`driver expected On Trip, got ${driver.data.data.status}`);
    }
  });

  await runTest(results, 'Step 5: vehicle hidden from dispatch selection pool while On Trip', async () => {
    const pool = await api('GET', '/vehicles?status=Available', { token: adminToken });
    assertStatus(pool.status, 200, 'available vehicles');

    const inPool = (pool.data.data || []).some((v) => v.id === vehicleId);
    if (inPool) {
      throw new Error('On Trip vehicle must not appear in Available dispatch pool');
    }

    const eligible = await api('GET', '/drivers/eligible', { token: adminToken });
    assertStatus(eligible.status, 200, 'eligible drivers');

    const driverInPool = (eligible.data.data || []).some((d) => d.id === driverId);
    if (driverInPool) {
      throw new Error('On Trip driver must not appear in eligible dispatch pool');
    }
  });

  await runTest(results, 'Step 6: complete trip → assets restored to Available', async () => {
    const complete = await api('PATCH', `/trips/${tripId}/complete`, {
      token: adminToken,
      body: {
        actualDistanceKm: 125,
        finalOdometerKm: 12050,
        fuelConsumedLiters: 22,
        revenue: 232400,
      },
    });

    assertStatus(complete.status, 200, 'complete trip');

    const vehicle = await api('GET', `/vehicles/${vehicleId}`, { token: adminToken });
    const driver = await api('GET', `/drivers/${driverId}`, { token: adminToken });

    if (vehicle.data.data.status !== 'Available') {
      throw new Error(`vehicle expected Available after complete, got ${vehicle.data.data.status}`);
    }

    if (driver.data.data.status !== 'Available') {
      throw new Error(`driver expected Available after complete, got ${driver.data.data.status}`);
    }
  });

  await runTest(results, 'Step 7: log maintenance (Oil Change) → vehicle In Shop', async () => {
    const { status, data } = await api('POST', '/maintenance', {
      token: adminToken,
      body: {
        vehicleId,
        title: 'Oil Change',
        description: 'Scheduled service after QA trip',
        cost: 7097,
      },
    });

    assertStatus(status, 201, 'create maintenance');
    assertTruthy(data.data?.id, 'maintenance id');
    maintenanceId = data.data.id;

    const vehicle = await api('GET', `/vehicles/${vehicleId}`, { token: adminToken });
    assertStatus(vehicle.status, 200, 'vehicle get after maintenance');

    if (vehicle.data.data.status !== 'In Shop') {
      throw new Error(`vehicle expected In Shop, got ${vehicle.data.data.status}`);
    }
  });

  await runTest(results, 'Step 8: vehicle immediately hidden from driver dispatch pool (In Shop)', async () => {
    const pool = await api('GET', '/vehicles?status=Available', { token: adminToken });
    assertStatus(pool.status, 200, 'available vehicles after maintenance');

    const inPool = (pool.data.data || []).some((v) => v.id === vehicleId);
    if (inPool) {
      throw new Error('In Shop vehicle must not appear in Available dispatch pool');
    }
  });

  await runTest(results, 'Step 9: fuel log + analytics dashboard reflect operational data', async () => {
    const fuel = await api('POST', '/fuel-logs', {
      token: adminToken,
      body: {
        vehicleId,
        tripId,
        liters: 22,
        cost: 3694,
        odometerKm: 12050,
      },
    });

    assertStatus(fuel.status, 201, 'create fuel log');

    const dashboard = await api('GET', '/analytics/dashboard', { token: adminToken });
    assertStatus(dashboard.status, 200, 'analytics dashboard');
    assertTruthy(dashboard.data.data?.fleetUtilization, 'fleet utilization');
    assertTruthy(dashboard.data.data?.vehicleRoi, 'vehicle roi array');

    const operational = await api('GET', '/fleet/reports/operational-cost', { token: adminToken });
    assertStatus(operational.status, 200, 'operational cost report');
    assertTruthy(operational.data.data?.summary, 'operational summary');
  });

  await runTest(results, 'Cleanup: close maintenance and release QA assets', async () => {
    if (maintenanceId) {
      const close = await api('PATCH', `/maintenance/${maintenanceId}/close`, { token: adminToken });
      assertStatus(close.status, 200, 'close maintenance');
    }

    const vehicle = await api('GET', `/vehicles/${vehicleId}`, { token: adminToken });
    assertStatus(vehicle.status, 200, 'vehicle still exists after workflow');
    if (vehicle.data.data.status !== 'Available') {
      throw new Error(`expected Available after maintenance close, got ${vehicle.data.data.status}`);
    }

    const delVehicle = await api('DELETE', `/vehicles/${vehicleId}`, { token: adminToken });
    if (delVehicle.status !== 200 && delVehicle.status !== 409) {
      throw new Error(`vehicle delete expected 200 or 409, got ${delVehicle.status}`);
    }

    const delDriver = await api('DELETE', `/drivers/${driverId}`, { token: adminToken });
    if (delDriver.status !== 200 && delDriver.status !== 409) {
      throw new Error(`driver delete expected 200 or 409, got ${delDriver.status}`);
    }
  });

  finish(results);
}

main().catch(async (error) => {
  console.error('\nTest runner crashed:', error.message);
  try {
    await cleanup();
  } catch {
    // ignore cleanup errors on crash
  }
  process.exitCode = 1;
});
