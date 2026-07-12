# TransitOps — Production Deployment Guide
# Role 9: Krish — DevOps & Live Deployment

Deploy the **Node.js API + PostgreSQL** backend on **Render** or **Railway**, and the **React (Vite)** frontend on **Vercel**.

## Architecture

```
┌─────────────────┐      HTTPS       ┌──────────────────────┐
│  Vercel         │  ──────────────► │  Render / Railway    │
│  React frontend │   VITE_API_URL   │  Node.js API         │
└─────────────────┘                  └──────────┬───────────┘
                                                │ DATABASE_URL
                                                ▼
                                     ┌──────────────────────┐
                                     │  Managed PostgreSQL  │
                                     └──────────────────────┘
```

---

## 1. Database migrations (analytics)

Apply migration **003** locally or via the cloud pre-deploy hook:

```cmd
cd backend
psql -U postgres -d transitops -f database/migrations/003_analytics_aggregations.sql
```

Or run all pending migrations:

```cmd
node scripts/run-migrations.js
```

### Analytics endpoints (after migration 003)

| Endpoint | Roles | Description |
|----------|-------|-------------|
| `GET /api/analytics/fleet-utilization?from=&to=` | Fleet Manager, Financial Analyst | Time-on-trip utilization % |
| `GET /api/analytics/fleet-utilization/current` | Fleet Manager, Financial Analyst | Live fleet snapshot |
| `GET /api/analytics/vehicle-roi?from=&to=` | Fleet Manager, Financial Analyst | Per-vehicle ROI |
| `GET /api/analytics/dashboard?from=&to=` | Fleet Manager, Financial Analyst | Combined KPIs |
| `GET /api/fleet/reports/operational-cost` | Fleet Manager, Financial Analyst | Legacy reports alias |

**ROI formula:** `(Revenue − (Maintenance + Fuel)) / Acquisition Cost × 100`

**Fleet utilization:** `SUM(trip active seconds) / (active fleet × period seconds) × 100`

See `backend/database/queries/analytics.sql` for raw SQL examples.

---

## 2. Backend on Render

### Option A — Blueprint (recommended)

1. Push repo to GitHub.
2. Render Dashboard → **New** → **Blueprint** → select `render.yaml`.
3. Set `CLIENT_URL` to your Vercel URL (e.g. `https://transitops.vercel.app`).
4. First deploy: set `RUN_SEED=true` so the admin user is created, then remove it.
5. Deploy. Migrations run automatically via `preDeployCommand`.

### Option B — Manual web service

1. **New → Web Service** → connect repo.
2. **Root directory:** `backend`
3. **Runtime:** Docker (uses `backend/Dockerfile`)
4. **Health check path:** `/api/health`
5. **New → PostgreSQL** → copy **Internal Database URL**.
6. Environment variables:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Render Postgres connection string |
| `DB_SSL` | `true` |
| `JWT_SECRET` | long random string |
| `CLIENT_URL` | `https://your-app.vercel.app` |
| `RUN_SEED` | `true` (first deploy only) |

7. **Pre-deploy command:** `node scripts/run-migrations.js`

API URL example: `https://transitops-api.onrender.com`

---

## 3. Backend on Railway

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**.
2. Add **PostgreSQL** plugin → Railway injects `DATABASE_URL`.
3. Set service **root** to `backend` or configure Dockerfile path `backend/Dockerfile`.
4. Variables (Dashboard → Variables):

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `DB_SSL` | `true` |
| `JWT_SECRET` | long random string |
| `CLIENT_URL` | `https://your-app.vercel.app` |
| `RUN_SEED` | `true` (first deploy only) |

5. `railway.toml` configures health checks and pre-deploy migrations.

API URL example: `https://transitops-api.up.railway.app`

---

## 4. Frontend on Vercel

1. [vercel.com](https://vercel.com) → **Add New Project** → import GitHub repo.
2. **Root Directory:** `frontend`
3. **Framework Preset:** Vite
4. **Environment variable** (Production):

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://transitops-api.onrender.com/api` |

Use your actual Render/Railway API URL with `/api` suffix.

5. Deploy. `frontend/vercel.json` handles SPA routing.

### CORS

Set backend `CLIENT_URL` to the exact Vercel domain. Multiple origins:

```env
CLIENT_URL=https://transitops.vercel.app,https://transitops-git-main.vercel.app
```

---

## 5. Docker (local production test)

```cmd
cd backend
docker build -t transitops-api .
docker run -p 5000:5000 --env-file .env transitops-api
```

With PostgreSQL via compose:

```cmd
cd backend
docker compose up -d postgres
set DATABASE_URL=postgres://postgres:postgres@localhost:5432/transitops
node scripts/run-migrations.js
docker run -p 5000:5000 -e DATABASE_URL=%DATABASE_URL% -e JWT_SECRET=local-test-secret -e CLIENT_URL=http://localhost:5173 transitops-api
```

---

## 6. Post-deploy checklist

- [ ] `GET https://<api-host>/api/health` returns `{ "success": true }`
- [ ] Login works from Vercel frontend
- [ ] `GET /api/analytics/fleet-utilization` returns utilization data
- [ ] `GET /api/analytics/vehicle-roi` returns ROI rows
- [ ] Change default admin password after first login
- [ ] Remove `RUN_SEED=true` after initial seed

---

## 7. Environment reference

**Backend production (`backend/.env.example` + cloud overrides):**

```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgres://user:pass@host:5432/transitops
DB_SSL=true
JWT_SECRET=<long-random-secret>
JWT_EXPIRES_IN=8h
CLIENT_URL=https://your-app.vercel.app
```

**Frontend production (`frontend/.env.example`):**

```env
VITE_API_URL=https://transitops-api.onrender.com/api
```
