# TransitOps — Smart Transport Operations Platform

A MERN-stack fleet management platform for dispatch, asset tracking, compliance, maintenance, fuel/expense logging, and operational analytics. Built as a hackathon project with role-based access for Fleet Managers, Drivers, Safety Officers, and Financial Analysts.

All monetary values are displayed and stored in **Indian Rupees (INR / ₹)**.

## Team & Contributions

| Member | Focus | Deliverables |
|--------|-------|--------------|
| **Krish** | Database & DevOps | PostgreSQL schema, seed data, connection pool, indexes & migrations |
| **Saad** | Backend Auth & Fleet API | JWT authentication, RBAC middleware, vehicle & driver CRUD, maintenance/fuel/expense APIs |
| **Abhishek** | Frontend UI | React app shell, auth flow, dashboards, trip dispatch & completion UI |
| **Jay** | Integration & QA | Axios client, Postman collection, phase 1–4 integration tests |

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| Frontend | React 19, Vite 8, Tailwind CSS v4, React Router, Axios, Lucide icons |
| Backend | Node.js, Express, JWT, bcrypt, Helmet, CORS, rate limiting |
| Database | PostgreSQL 16 with triggers, ENUMs, analytics views, and migrations |
| Testing | Node.js integration tests (4 phases), Postman collection |

## Project Structure

```
TransitOps Smart Transport Operation Platform/
├── backend/
│   ├── config/          # DB pool, role constants
│   ├── controllers/     # Auth, vehicle, driver, trip, maintenance, fuel, expense, analytics
│   ├── database/        # schema.sql, seed.sql, migrations, seed-demo.sql
│   ├── middleware/      # JWT auth, RBAC, error handling
│   ├── routes/          # /auth, /vehicles, /drivers, /trips, /maintenance, /fuel-logs, /expenses, /analytics, /fleet
│   ├── services/        # Business logic layer
│   └── server.js
├── frontend/
│   └── src/
│       ├── components/  # Layout, BrandLogo, modals, charts, auth guards
│       ├── context/     # AuthContext (JWT + user state)
│       ├── pages/       # Dashboard, Vehicles, Drivers, Trips, Maintenance, Compliance, Reports, Expenses, Fuel Logs
│       ├── services/    # apiClient.js, api.js
│       └── utils/       # currency.js (formatINR), apiError.js
├── postman/             # Postman collection & environment
└── tests/               # phase1–phase4 integration tests
```

## Prerequisites

- **Node.js** 18+
- **PostgreSQL** 16 (Windows default path: `C:\Program Files\PostgreSQL\16\bin\psql.exe`)
- **npm**

## Quick Start

### 1. Database setup

```cmd
psql -U postgres -c "CREATE DATABASE transitops;"

cd backend
psql -U postgres -d transitops -f database/schema.sql
psql -U postgres -d transitops -f database/seed.sql
psql -U postgres -d transitops -f database/migrations/002_indexes_and_constraints.sql
psql -U postgres -d transitops -f database/migrations/003_analytics_aggregations.sql
psql -U postgres -d transitops -f database/migrations/004_usd_to_inr.sql
```

Optional demo data (Van-05 vehicle, Alex driver sample workflow):

```cmd
psql -U postgres -d transitops -f database/seed-demo.sql
```

Or use the setup script on Windows:

```powershell
.\backend\scripts\setup-db.ps1
```

Or run all migrations via npm:

```cmd
cd backend
npm run db:migrate:all
```

See [backend/database/README.md](backend/database/README.md) for schema details and migration notes.

### 2. Backend

```cmd
cd backend
copy .env.example .env
npm install
npm run dev
```

API runs at **http://localhost:5000**

Health check: `GET http://localhost:5000/api/health`

### 3. Frontend

```cmd
cd frontend
copy .env.example .env
npm install
npm run dev
```

App runs at **http://localhost:5173** (Vite proxies `/api` → backend).

### Default admin account

| Field | Value |
|-------|-------|
| Email | `admin@transitops.local` |
| Password | `Admin@123` |
| Role | Fleet Manager |

## Roles & Access

| Role | Frontend modules | Backend access |
|------|------------------|----------------|
| **Fleet Manager** | Full access (Dashboard, Vehicles, Drivers, Trips, Maintenance, Compliance, Reports, Expenses, Fuel Logs) | All endpoints |
| **Driver** | Dashboard, Trips, Fuel Logs | Trip create/dispatch/complete, eligible drivers, fuel logs |
| **Safety Officer** | Dashboard, Drivers, Compliance | Driver list, suspend, compliance reports |
| **Financial Analyst** | Dashboard, Reports, Expenses, Fuel Logs | Analytics, cost reports, expenses, fuel logs |

## API Endpoints

### Auth — `/api/auth`

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| POST | `/login` | Public | Returns JWT |
| POST | `/register` | Fleet Manager | Create user |
| GET | `/me` | Authenticated | Current user profile |
| PATCH | `/change-password` | Authenticated | Update password |

### Vehicles — `/api/vehicles`

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| GET | `/` | All roles | List vehicles (search & status filters) |
| GET | `/:id` | All roles | Get vehicle by ID |
| POST | `/` | Fleet Manager | Create vehicle |
| PUT | `/:id` | Fleet Manager | Update vehicle |
| DELETE | `/:id` | Fleet Manager | Delete vehicle |

Duplicate registration numbers return **409 Conflict**.

### Drivers — `/api/drivers`

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| GET | `/eligible` | Fleet Manager, Driver | Dispatch-ready drivers |
| GET | `/` | Fleet Manager, Safety Officer | List drivers |
| GET | `/:id` | Fleet Manager, Safety Officer | Get driver by ID |
| POST | `/` | Fleet Manager | Create driver |
| PUT | `/:id` | Fleet Manager | Update driver |
| PATCH | `/:id/suspend` | Fleet Manager, Safety Officer | Suspend driver |
| DELETE | `/:id` | Fleet Manager | Delete driver |

Expired licenses and suspended drivers are blocked at the service layer (**403**).

### Trips — `/api/trips`

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| GET | `/` | Fleet Manager, Driver, Safety Officer, Financial Analyst | List trips |
| GET | `/:id` | Same as above | Get trip by ID |
| POST | `/` | Fleet Manager, Driver | Create trip |
| PUT | `/:id` | Fleet Manager, Driver | Update trip |
| PATCH | `/:id/dispatch` | Fleet Manager, Driver | Dispatch trip |
| PATCH | `/:id/complete` | Fleet Manager, Driver | Complete trip (odometer, fuel, revenue) |
| PATCH | `/:id/cancel` | Fleet Manager, Driver | Cancel trip |

### Maintenance — `/api/maintenance`

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| GET | `/` | Fleet Manager, Financial Analyst, Safety Officer | List maintenance records |
| POST | `/` | Fleet Manager | Log maintenance |
| PATCH | `/:id/close` | Fleet Manager | Close maintenance record |

### Fuel logs — `/api/fuel-logs`

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| GET | `/` | Fleet Manager, Financial Analyst, Driver | List fuel logs |
| POST | `/` | Fleet Manager, Financial Analyst, Driver | Create fuel log |

### Expenses — `/api/expenses`

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| GET | `/` | Fleet Manager, Financial Analyst | List expenses |
| POST | `/` | Fleet Manager, Financial Analyst | Create expense (Toll, Maintenance, Fuel, Other) |

### Analytics — `/api/analytics`

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| GET | `/operations-summary` | All roles | Role-safe dashboard KPIs |
| GET | `/dashboard` | Fleet Manager, Financial Analyst | Full dashboard KPIs |
| GET | `/fleet-utilization` | Fleet Manager, Financial Analyst | Fleet utilization report |
| GET | `/fleet-utilization/current` | Fleet Manager, Financial Analyst | Current utilization snapshot |
| GET | `/vehicle-roi` | Fleet Manager, Financial Analyst | Vehicle ROI table |
| GET | `/fuel-efficiency` | Fleet Manager, Financial Analyst | Fuel efficiency (km/L) |

### Fleet convenience routes — `/api/fleet`

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| GET | `/vehicles` | Fleet Manager | Fleet vehicle list |
| POST | `/trips` | Fleet Manager, Driver | Create trip (alias) |
| PATCH | `/trips/:id/dispatch` | Fleet Manager, Driver | Dispatch trip (alias) |
| GET | `/drivers/compliance` | Safety Officer, Fleet Manager | Compliance summary (expired, expiring, suspended) |
| PATCH | `/drivers/:id/suspend` | Safety Officer, Fleet Manager | Suspend driver |
| GET | `/reports/operational-cost` | Financial Analyst, Fleet Manager | Operational cost & ROI summary |
| POST | `/expenses` | Financial Analyst, Fleet Manager | Create expense (alias) |
| POST | `/fuel-logs` | Financial Analyst, Fleet Manager, Driver | Create fuel log (alias) |

## Frontend Features

| Module | Status |
|--------|--------|
| Login & JWT session | ✅ Complete |
| Branded layout (sidebar + header logo) | ✅ Complete |
| Dashboard with KPIs & charts | ✅ Complete |
| Vehicles CRUD dashboard | ✅ Complete |
| Drivers CRUD dashboard | ✅ Complete |
| Trips (dispatch, complete with odometer/fuel/revenue) | ✅ Complete |
| Maintenance logging & close workflow | ✅ Complete |
| Compliance (expired/expiring licenses, suspend) | ✅ Complete |
| Reports (utilization, ROI, fuel efficiency, CSV/PDF export) | ✅ Complete |
| Expenses & Fuel Logs | ✅ Complete |
| INR currency formatting | ✅ Complete |

## Testing

**Automated integration tests** (backend must be running on port 5000):

```cmd
node tests/phase1-auth.test.js
node tests/phase2-assets.test.js
node tests/phase3-trips.test.js
node tests/phase4-full-system.test.js
```

Or from the backend folder:

```cmd
cd backend
npm run test:auth
npm run test:assets
npm run test:trips
npm run test:full-system
```

| Phase | File | Coverage |
|-------|------|----------|
| 1 | `phase1-auth.test.js` | Auth, JWT, RBAC |
| 2 | `phase2-assets.test.js` | Vehicle & driver CRUD edge cases |
| 3 | `phase3-trips.test.js` | Trip lifecycle state machine |
| 4 | `phase4-full-system.test.js` | Full PDF workflow E2E |

**Postman:** Import `postman/TransitOps-Phase1-Auth.postman_collection.json` and `postman/TransitOps-Local.postman_environment.json`.

See [tests/README.md](tests/README.md) for the full test matrix.

## Environment Variables

**Backend** (`backend/.env`):

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=transitops
DB_USER=postgres
DB_PASSWORD=postgres
PORT=5000
CLIENT_URL=http://localhost:5173
JWT_SECRET=change-this-to-a-long-random-secret-in-production
JWT_EXPIRES_IN=8h
```

**Frontend** (`frontend/.env`):

```env
VITE_API_URL=/api
```

## Git Workflow (Team)

This project uses two remotes:

| Remote | Purpose |
|--------|---------|
| `origin` | Private repo |
| `public` | Public hackathon repo |

Standard push flow after committing:

```cmd
git add .
git commit -m "your message"
git pull origin main --rebase && git push origin main
git pull public main --rebase && git push public main
```

Each teammate should set their own Git identity before committing so GitHub credits contributors correctly:

```cmd
git config user.name "Your Name"
git config user.email "your@email.com"
```

## Roadmap

- [x] PostgreSQL schema with business-rule triggers
- [x] JWT authentication & RBAC
- [x] Vehicle & driver CRUD (backend + frontend)
- [x] Trip management (CRUD + dispatch + complete workflow)
- [x] Maintenance, fuel, and expense tracking (backend + frontend)
- [x] Live dashboard KPIs, analytics reports, and charts
- [x] INR currency support
- [x] Integration tests (phase 1–4) & Postman collection
- [ ] Email license expiry reminders
- [ ] Vehicle document uploads
- [ ] Dark mode

## License

MIT — TransitOps Team
