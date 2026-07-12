# TransitOps — Phase 1 Integration & QA (Jay)

Authentication and RBAC verification for Phase 1.

## What's included

| Asset | Purpose |
|-------|---------|
| `frontend/src/services/apiClient.js` | Centralized Axios client with JWT interceptors |
| `frontend/src/services/api.js` | Auth + fleet API wrappers using Axios |
| `tests/phase1-auth.test.js` | Automated Node.js integration test runner |
| `postman/TransitOps-Phase1-Auth.postman_collection.json` | Postman collection with test scripts |
| `postman/TransitOps-Local.postman_environment.json` | Local environment variables |

## Axios client behavior

**Request interceptor**
- Reads `transitops_token` from `localStorage`
- Injects `Authorization: Bearer <token>` on every request

**Response interceptor**
- Normalizes API error messages
- On `401` (except login): clears session and redirects to `/login`

## Run automated tests

**Terminal 1 — start backend**
```cmd
cd backend
npm run dev
```

**Terminal 2 — run tests**
```cmd
node tests/phase1-auth.test.js
```

Expected output:
```text
✅ GET /api/health returns 200
✅ POST /auth/login rejects invalid credentials with 401
✅ POST /auth/login returns JWT for admin
...
Results: 14 passed, 0 failed, 14 total
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
