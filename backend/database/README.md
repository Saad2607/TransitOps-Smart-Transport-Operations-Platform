# TransitOps — Database Layer (Role 1: Krish)

Production-ready PostgreSQL schema and connection pooling for the **TransitOps Smart Transport Operations Platform** hackathon.

## Quick Start

```bash
# 1. Create database
psql -U postgres -c "CREATE DATABASE transitops;"

# 2. Apply schema + seed
cd backend
psql -U postgres -d transitops -f database/schema.sql
psql -U postgres -d transitops -f database/seed.sql

# 3. Configure environment
copy .env.example .env

# 4. Install & run API
npm install
npm run dev
```

## Migrations (Role 5: Krish)

Apply after `schema.sql`:

```bash
psql -U postgres -d transitops -f database/migrations/002_indexes_and_constraints.sql
psql -U postgres -d transitops -f database/migrations/003_analytics_aggregations.sql
```

Or run all pending migrations (cloud-safe):

```bash
node scripts/run-migrations.js
```

### Migration 002 highlights

| Feature | Purpose |
|---------|---------|
| Composite indexes | Faster filters on `vehicle.status`, `driver.status`, `trip.status` |
| Partial indexes | Optimized dispatch pool, active trips, license expiry reports |
| `normalize_registration_number()` | Case/whitespace insensitive registration numbers |
| `register_vehicle_safe()` | Graceful JSON response on duplicate registration conflicts |
| `schema_migrations` | Tracks applied migration versions |

### Test duplicate registration handling

```sql
SELECT register_vehicle_safe('Van-05', 'Ford Transit', 'Van', 500, 0, 25000, 'Available', 'North');

SELECT register_vehicle_safe('van-05', 'Duplicate Attempt', 'Van', 500);
-- Returns: success=false, conflict=true, code='DUPLICATE_REGISTRATION'
```

### Migration 003 highlights (Role 9: Analytics)

| Feature | Purpose |
|---------|---------|
| `trips.revenue` | Explicit revenue on completed trips |
| `estimate_trip_revenue()` | Fallback revenue from distance + cargo |
| `get_fleet_utilization(from, to)` | Time-on-trip fleet utilization % |
| `get_vehicle_roi(from, to)` | Per-vehicle ROI aggregation |
| `vehicle_roi_summary` | All-time ROI view |
| `fleet_utilization_current` | Live fleet utilization snapshot |

**ROI formula:** `(Revenue − (Maintenance + Fuel)) / Acquisition Cost × 100`

See `database/queries/analytics.sql` for copy-paste query examples.

Health check: `GET http://localhost:5000/api/health`

## Schema Overview

| Table | Purpose |
|---|---|
| `roles` | RBAC — Fleet Manager, Driver, Safety Officer, Financial Analyst |
| `users` | Email/password auth linked to a role |
| `vehicles` | Fleet registry with unique registration number |
| `drivers` | Driver profiles, license tracking, safety score |
| `trips` | Dispatch lifecycle: Draft → Dispatched → Completed → Cancelled |
| `maintenance_logs` | Vehicle maintenance; auto-sets status to **In Shop** |
| `fuel_logs` | Fuel consumption records per vehicle/trip |
| `expenses` | Tolls, maintenance, and other operational costs |

## ENUM Types

- **vehicle_status**: `Available`, `On Trip`, `In Shop`, `Retired`
- **driver_status**: `Available`, `On Trip`, `Off Duty`, `Suspended`
- **trip_status**: `Draft`, `Dispatched`, `Completed`, `Cancelled`
- **maintenance_status**: `Active`, `Closed`
- **expense_category**: `Toll`, `Maintenance`, `Fuel`, `Other`

## Enforced Business Rules (DB Triggers)

| Rule | Implementation |
|---|---|
| Cargo ≤ vehicle capacity | Blocked on dispatch |
| Expired/suspended driver | Blocked on dispatch |
| Vehicle not Available | Blocked on dispatch |
| Dispatch → On Trip | Auto-updates vehicle + driver |
| Complete → Available | Auto-restores vehicle + driver |
| Cancel dispatched trip | Restores vehicle + driver |
| Active maintenance → In Shop | Trigger on insert |
| Close maintenance → Available | Trigger on status change |

## Connection Pool (`config/db.js`)

Exports:

- `pool` — raw `pg.Pool` instance
- `query(text, params)` — simple query helper
- `getClient()` — dedicated client for manual transactions
- `withTransaction(fn)` — auto COMMIT/ROLLBACK wrapper
- `healthCheck()` — readiness probe
- `closePool()` — graceful shutdown

## Default Admin (seed)

| Field | Value |
|---|---|
| Email | `admin@transitops.local` |
| Password | `Admin@123` |
| Role | Fleet Manager |

## Analytics View

`vehicle_operational_costs` — aggregates fuel, maintenance, and other expenses per vehicle for dashboard KPIs and ROI calculations.
