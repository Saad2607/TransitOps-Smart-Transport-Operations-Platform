# TransitOps — Integration & QA (Jay)

Authentication, RBAC, and asset CRUD edge-case verification.

## What's included

| Asset | Purpose |
|-------|---------|
| `frontend/src/services/apiClient.js` | Centralized Axios client with JWT interceptors |
| `frontend/src/services/api.js` | Auth + fleet API wrappers using Axios |
| `frontend/src/utils/apiError.js` | Maps API rejections to titled UI error banners |
| `tests/phase1-auth.test.js` | Phase 1 — auth & RBAC integration tests |
| `tests/phase2-assets.test.js` | Phase 2 — vehicle/driver CRUD edge-case tests |
| `tests/phase3-trips.test.js` | Phase 3 — trip lifecycle state machine tests |
| `tests/phase4-full-system.test.js` | Phase 4 — full PDF workflow E2E (trip → maintenance → analytics) |
| `postman/TransitOps-Local.postman_environment.json` | Local environment variables |

## Axios client behavior

**Request interceptor**
- Reads `transitops_token` from `localStorage`
- Injects `Authorization: Bearer <token>` on every request

**Response interceptor**
- Normalizes API error messages and preserves `status` + `details` on the error
- On `401` (except login): clears session and redirects to `/login`

## UI error banners (frontend-backend sync)

The Vehicle and Driver forms display a titled error banner when the API
rejects a save. The banner title is derived from the HTTP status:

| Status | Vehicle form banner | Driver form banner |
|--------|---------------------|--------------------|
| `409` | Duplicate registration number | Duplicate license number |
| `403` | Action not allowed | License or status check failed |
| `400` | Invalid vehicle details | Invalid driver details |

The backend's descriptive message (e.g. *"Vehicle registration number
"VAN-05" is already taken."*) is shown below the title.

## Run automated tests

**Terminal 1 — start backend**
```cmd
cd backend
npm run dev
```

**Terminal 2 — run tests**
```cmd
node tests/phase1-auth.test.js
node tests/phase2-assets.test.js
node tests/phase3-trips.test.js
node tests/phase4-full-system.test.js
```

Expected output:
```text
✅ GET /api/health returns 200
✅ POST /auth/login rejects invalid credentials with 401
✅ POST /auth/login returns JWT for admin
...
Results: 14 passed, 0 failed, 14 total
```

## Phase 2 edge-case matrix (`phase2-assets.test.js`)

| Test | Expected |
|------|----------|
| Create vehicle | `201` |
| Duplicate registration (exact) | `409` + "already taken" |
| Duplicate registration (case/whitespace variant) | `409` |
| Vehicle with missing fields | `400` |
| Update vehicle to a taken registration | `409` |
| Create vehicle as Driver role | `403` |
| Create driver with valid license | `201`, `isLicenseExpired=false` |
| Duplicate driver license number | `409` + "already registered" |
| Expired license + `Available` status | `403` + "expired" |
| Expired license + `Off Duty` status | `201`, `isLicenseExpired=true` |
| Set expired-license driver to `Available` | `403` |
| Create driver as `Suspended` | `400` |
| Suspend driver | `200`, status `Suspended` |
| `/drivers/eligible` excludes suspended/expired | `200`, QA drivers absent |

The suite creates uniquely-named QA records (run-ID suffix) and deletes
them at the end, so it can be re-run safely.

## Phase 4 full-system workflow (`phase4-full-system.test.js`)

| Step | Expected |
|------|----------|
| Register 500 kg vehicle | `201`, status `Available` |
| Register driver with valid license | `201` |
| Create + dispatch trip (450 kg cargo) | Vehicle/driver → `On Trip` |
| Dispatch pool while On Trip | Vehicle absent from `/vehicles?status=Available` |
| Complete trip | Vehicle/driver → `Available` |
| Log maintenance (Oil Change) | Vehicle → `In Shop` via DB trigger |
| Dispatch pool while In Shop | Vehicle absent from Available pool |
| Fuel log + analytics | `/analytics/dashboard` + operational cost report `200` |
| Cleanup | Close maintenance; delete accepts `200` or `409` (FK-linked) |

```cmd
node tests/phase4-full-system.test.js
```

## Postman setup

1. Open Postman
2. **Import** → `postman/TransitOps-Phase1-Auth.postman_collection.json`
3. **Import** → `postman/TransitOps-Local.postman_environment.json`
4. Select environment: **TransitOps Local**
5. Run collection with **Collection Runner**

Run folders in order:
1. `01 — Health`
2. `02 — Auth (Public)` (saves tokens to environment)
3. `03 — Auth (Protected)`
4. `04 — RBAC Fleet Routes`

## Phase 1 test matrix

| Test | Expected |
|------|----------|
| Login with wrong password | `401` |
| Login with valid admin | `200` + JWT |
| `/auth/me` without token | `401` |
| `/auth/me` with valid token | `200` |
| `/fleet/vehicles` without token | `401` |
| `/fleet/vehicles` as Fleet Manager | `200` |
| `/fleet/vehicles` as Driver | `403` |
| `/auth/register` without token | `401` |
| `/fleet/trips` as Driver | `201` |
| `/fleet/reports/operational-cost` as Driver | `403` |

## Frontend install (Axios)

```cmd
cd frontend
npm install
npm run dev
```

## Environment overrides (optional)

```cmd
set API_BASE_URL=http://localhost:5000/api
set ADMIN_EMAIL=admin@transitops.local
set ADMIN_PASSWORD=Admin@123
node tests/phase1-auth.test.js
```
