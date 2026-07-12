/**
 * TransitOps — Phase 3 Trip Lifecycle Integration Tests
 * Role 10: Saad — state machine & transactional validations
 *
 * Usage:
 *   1. Start backend: cd backend && npm run dev
 *   2. Run tests:     node tests/phase3-trips.test.js
 *
 * If login fails, set the admin password your DB uses:
 *   set ADMIN_PASSWORD=Admin@456
 *   node tests/phase3-trips.test.js
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

let adminToken = '';
let vehicleId = null;
let driverId = null;
let tripId = null;

const results = [];

async function main() {
  console.log('\nTransitOps Phase 3 — Trip Lifecycle Tests');
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

  await runTest(results, 'Setup: resolve vehicle and driver ids', async () => {
    const vehicles = await api('GET', '/vehicles', { token: adminToken });
    const drivers = await api('GET', '/drivers', { token: adminToken });

    assertStatus(vehicles.status, 200, 'vehicles');
    assertStatus(drivers.status, 200, 'drivers');

    vehicleId = vehicles.data.data[0]?.id;
    driverId = drivers.data.data[0]?.id;

    assertTruthy(vehicleId, 'vehicleId');
    assertTruthy(driverId, 'driverId');
  });

  if (!vehicleId || !driverId) {
    finish(results);
    return;
  }

  await runTest(results, 'POST /trips creates Draft trip (201)', async () => {
    const { status, data } = await api('POST', '/trips', {
      token: adminToken,
      body: {
        source: `Warehouse A ${RUN_ID}`,
        destination: `Depot B ${RUN_ID}`,
        vehicleId,
        driverId,
        cargoWeightKg: 400,
        plannedDistanceKm: 120,
      },
    });

    assertStatus(status, 201, 'create trip');
    assertTruthy(data.data?.id, 'trip id');
    if (data.data.status !== 'Draft') throw new Error('expected Draft status');

    tripId = data.data.id;
  });

  if (!tripId) {
    finish(results);
    return;
  }

  await runTest(results, 'PUT /trips/:id rejects cargo over capacity (400)', async () => {
    const { status } = await api('PUT', `/trips/${tripId}`, {
      token: adminToken,
      body: { cargoWeightKg: 9999 },
    });

    assertStatus(status, 400, 'overweight cargo');
  });

  await runTest(results, 'PATCH /trips/:id/dispatch moves to Dispatched (200)', async () => {
    const { status, data } = await api('PATCH', `/trips/${tripId}/dispatch`, {
      token: adminToken,
    });

    assertStatus(status, 200, 'dispatch');
    if (data.data.status !== 'Dispatched') throw new Error('expected Dispatched');
  });

  await runTest(results, 'Vehicle and driver are On Trip after dispatch', async () => {
    const vehicle = await api('GET', `/vehicles/${vehicleId}`, { token: adminToken });
    const driver = await api('GET', `/drivers/${driverId}`, { token: adminToken });

    assertStatus(vehicle.status, 200, 'vehicle get');
    assertStatus(driver.status, 200, 'driver get');

    if (vehicle.data.data.status !== 'On Trip') {
      throw new Error(`vehicle status expected On Trip, got ${vehicle.data.data.status}`);
    }

    if (driver.data.data.status !== 'On Trip') {
      throw new Error(`driver status expected On Trip, got ${driver.data.data.status}`);
    }
  });

  await runTest(results, 'PATCH /trips/:id/dispatch rejects duplicate dispatch (409)', async () => {
    const { status } = await api('PATCH', `/trips/${tripId}/dispatch`, { token: adminToken });
    assertStatus(status, 409, 'duplicate dispatch');
  });

  await runTest(results, 'POST /trips rejects vehicle already On Trip (409)', async () => {
    const { status } = await api('POST', '/trips', {
      token: adminToken,
      body: {
        source: 'Conflict',
        destination: 'Trip',
        vehicleId,
        driverId,
        cargoWeightKg: 100,
        plannedDistanceKm: 10,
      },
    });

    assertStatus(status, 409, 'vehicle on trip conflict');
  });

  await runTest(results, 'PATCH /trips/:id/complete completes trip (200)', async () => {
    const { status, data } = await api('PATCH', `/trips/${tripId}/complete`, {
      token: adminToken,
      body: {
        actualDistanceKm: 125,
        finalOdometerKm: 5025,
        fuelConsumedLiters: 18,
        revenue: 207500,
      },
    });

    assertStatus(status, 200, 'complete');
    if (data.data.status !== 'Completed') throw new Error('expected Completed');
  });

  await runTest(results, 'Vehicle and driver restored to Available after complete', async () => {
    const vehicle = await api('GET', `/vehicles/${vehicleId}`, { token: adminToken });
    const driver = await api('GET', `/drivers/${driverId}`, { token: adminToken });

    assertStatus(vehicle.status, 200, 'vehicle get');
    assertStatus(driver.status, 200, 'driver get');

    if (vehicle.data.data.status !== 'Available') {
      throw new Error(`vehicle expected Available, got ${vehicle.data.data.status}`);
    }

    if (driver.data.data.status !== 'Available') {
      throw new Error(`driver expected Available, got ${driver.data.data.status}`);
    }
  });

  await runTest(results, 'PATCH /trips/:id/cancel rejects terminal Completed trip (409)', async () => {
    const { status } = await api('PATCH', `/trips/${tripId}/cancel`, { token: adminToken });
    assertStatus(status, 409, 'cancel completed trip');
  });

  await runTest(results, 'Draft → Cancelled restores nothing harmful (200)', async () => {
    const created = await api('POST', '/trips', {
      token: adminToken,
      body: {
        source: 'Cancel Me',
        destination: 'Nowhere',
        cargoWeightKg: 50,
        plannedDistanceKm: 5,
      },
    });

    assertStatus(created.status, 201, 'create draft for cancel');

    const cancel = await api('PATCH', `/trips/${created.data.data.id}/cancel`, {
      token: adminToken,
    });

    assertStatus(cancel.status, 200, 'cancel draft');
    if (cancel.data.data.status !== 'Cancelled') throw new Error('expected Cancelled');
  });

  finish(results);
}

main().catch((error) => {
  console.error('\nTest runner crashed:', error.message);
  process.exitCode = 1;
});
