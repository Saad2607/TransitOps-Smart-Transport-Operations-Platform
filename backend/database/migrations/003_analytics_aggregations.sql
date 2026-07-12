-- =============================================================================
-- TransitOps Migration 003
-- Role 9: Krish — Analytics Aggregations (Fleet Utilization & Vehicle ROI)
--
-- Run after 002_indexes_and_constraints.sql:
--   psql -U postgres -d transitops -f database/migrations/003_analytics_aggregations.sql
-- =============================================================================

BEGIN;

INSERT INTO schema_migrations (version, description)
VALUES (
  '003_analytics_aggregations',
  'Trip revenue column, analytics indexes, fleet utilization & vehicle ROI views/functions'
)
ON CONFLICT (version) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Trip revenue (explicit on completion; NULL falls back to estimate function)
-- ---------------------------------------------------------------------------
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS revenue NUMERIC(14, 2);

ALTER TABLE trips
  DROP CONSTRAINT IF EXISTS chk_trips_revenue_non_negative;

ALTER TABLE trips
  ADD CONSTRAINT chk_trips_revenue_non_negative
  CHECK (revenue IS NULL OR revenue >= 0);

COMMENT ON COLUMN trips.revenue IS
  'Trip revenue recorded at completion. When NULL, analytics use estimate_trip_revenue().';

-- ---------------------------------------------------------------------------
-- Aggregation-friendly indexes (partial, covering hot filters)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_trips_completed_vehicle_period
  ON trips (vehicle_id, completed_at DESC)
  WHERE status = 'Completed' AND vehicle_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trips_dispatched_vehicle_period
  ON trips (vehicle_id, dispatched_at DESC)
  WHERE status IN ('Dispatched', 'Completed') AND vehicle_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fuel_logs_vehicle_cost
  ON fuel_logs (vehicle_id)
  INCLUDE (cost);

CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle_cost
  ON maintenance_logs (vehicle_id)
  INCLUDE (cost);

-- ---------------------------------------------------------------------------
-- Revenue estimate when trips.revenue is not set explicitly
-- Rates: ₹12.50 / km + ₹0.85 / kg cargo (adjust via function args if needed)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION estimate_trip_revenue(
  p_distance_km NUMERIC,
  p_cargo_kg NUMERIC,
  p_rate_per_km NUMERIC DEFAULT 12.50,
  p_rate_per_kg NUMERIC DEFAULT 0.85
)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ROUND(
    (COALESCE(p_distance_km, 0) * p_rate_per_km)
    + (COALESCE(p_cargo_kg, 0) * p_rate_per_kg),
    2
  );
$$;

CREATE OR REPLACE FUNCTION resolved_trip_revenue(t trips)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    t.revenue,
    estimate_trip_revenue(
      COALESCE(t.actual_distance_km, t.planned_distance_km),
      t.cargo_weight_kg
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- Per-vehicle cost & revenue rollups (all-time baseline view)
-- ROI = (Revenue - (Maintenance + Fuel)) / Acquisition Cost
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW vehicle_roi_summary AS
WITH trip_revenue AS (
  SELECT
    t.vehicle_id,
    SUM(resolved_trip_revenue(t)) AS total_revenue,
    COUNT(*) FILTER (WHERE t.status = 'Completed') AS completed_trips
  FROM trips t
  WHERE t.vehicle_id IS NOT NULL
    AND t.status = 'Completed'
  GROUP BY t.vehicle_id
),
vehicle_costs AS (
  SELECT
    v.id AS vehicle_id,
    v.registration_number,
    v.name_model,
    v.acquisition_cost,
    v.status,
    COALESCE(tr.total_revenue, 0) AS total_revenue,
    COALESCE(tr.completed_trips, 0) AS completed_trips,
    COALESCE(f.fuel_cost, 0) AS fuel_cost,
    COALESCE(m.maintenance_cost, 0) AS maintenance_cost
  FROM vehicles v
  LEFT JOIN trip_revenue tr ON tr.vehicle_id = v.id
  LEFT JOIN (
    SELECT vehicle_id, SUM(cost) AS fuel_cost
    FROM fuel_logs
    GROUP BY vehicle_id
  ) f ON f.vehicle_id = v.id
  LEFT JOIN (
    SELECT vehicle_id, SUM(cost) AS maintenance_cost
    FROM maintenance_logs
    GROUP BY vehicle_id
  ) m ON m.vehicle_id = v.id
)
SELECT
  vehicle_id,
  registration_number,
  name_model,
  status,
  acquisition_cost,
  total_revenue,
  fuel_cost,
  maintenance_cost,
  (fuel_cost + maintenance_cost) AS total_operating_cost,
  (total_revenue - fuel_cost - maintenance_cost) AS net_profit,
  CASE
    WHEN acquisition_cost > 0 THEN
      ROUND(
        ((total_revenue - fuel_cost - maintenance_cost) / acquisition_cost) * 100,
        2
      )
    ELSE NULL
  END AS roi_percent,
  completed_trips
FROM vehicle_costs;

COMMENT ON VIEW vehicle_roi_summary IS
  'Vehicle ROI % = (Revenue - (Maintenance + Fuel)) / Acquisition Cost × 100';

-- ---------------------------------------------------------------------------
-- Fleet utilization snapshot (current operational state)
-- Utilization % = vehicles actively utilized / total non-retired fleet
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW fleet_utilization_current AS
WITH fleet AS (
  SELECT
    COUNT(*) FILTER (WHERE status <> 'Retired') AS active_fleet,
    COUNT(*) FILTER (WHERE status = 'On Trip') AS on_trip_now,
    COUNT(*) FILTER (WHERE status = 'Available') AS available_now,
    COUNT(*) FILTER (WHERE status = 'In Shop') AS in_shop_now
  FROM vehicles
),
period_trips AS (
  SELECT COUNT(DISTINCT vehicle_id) AS vehicles_with_completed_trips_30d
  FROM trips
  WHERE status = 'Completed'
    AND completed_at >= NOW() - INTERVAL '30 days'
    AND vehicle_id IS NOT NULL
)
SELECT
  f.active_fleet,
  f.on_trip_now,
  f.available_now,
  f.in_shop_now,
  p.vehicles_with_completed_trips_30d,
  CASE
    WHEN f.active_fleet > 0 THEN
      ROUND((f.on_trip_now::NUMERIC / f.active_fleet) * 100, 2)
    ELSE 0
  END AS utilization_percent_on_trip,
  CASE
    WHEN f.active_fleet > 0 THEN
      ROUND((p.vehicles_with_completed_trips_30d::NUMERIC / f.active_fleet) * 100, 2)
    ELSE 0
  END AS utilization_percent_30d_activity
FROM fleet f
CROSS JOIN period_trips p;

-- ---------------------------------------------------------------------------
-- Parameterized fleet utilization for a date window (time-on-trip based)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_fleet_utilization(
  p_start_date DATE DEFAULT (CURRENT_DATE - INTERVAL '30 days')::DATE,
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  active_fleet INTEGER,
  utilized_vehicles INTEGER,
  total_trip_seconds NUMERIC,
  period_seconds NUMERIC,
  utilization_percent NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  WITH bounds AS (
    SELECT
      p_start_date::TIMESTAMPTZ AS start_ts,
      (p_end_date + INTERVAL '1 day')::TIMESTAMPTZ AS end_ts,
      EXTRACT(EPOCH FROM ((p_end_date + INTERVAL '1 day')::TIMESTAMPTZ - p_start_date::TIMESTAMPTZ)) AS period_secs
  ),
  active AS (
    SELECT COUNT(*)::INTEGER AS cnt
    FROM vehicles
    WHERE status <> 'Retired'
  ),
  trip_usage AS (
    SELECT
      t.vehicle_id,
      SUM(
        GREATEST(
          0,
          EXTRACT(
            EPOCH FROM (
              LEAST(COALESCE(t.completed_at, b.end_ts), b.end_ts)
              - GREATEST(COALESCE(t.dispatched_at, t.created_at), b.start_ts)
            )
          )
        )
      ) AS seconds_on_trip
    FROM trips t
    CROSS JOIN bounds b
    WHERE t.vehicle_id IS NOT NULL
      AND t.status IN ('Dispatched', 'Completed')
      AND COALESCE(t.dispatched_at, t.created_at) < b.end_ts
      AND COALESCE(t.completed_at, b.end_ts) > b.start_ts
    GROUP BY t.vehicle_id
  )
  SELECT
    a.cnt AS active_fleet,
    (SELECT COUNT(*)::INTEGER FROM trip_usage WHERE seconds_on_trip > 0) AS utilized_vehicles,
    COALESCE((SELECT SUM(seconds_on_trip) FROM trip_usage), 0) AS total_trip_seconds,
    b.period_secs AS period_seconds,
    CASE
      WHEN a.cnt > 0 AND b.period_secs > 0 THEN
        ROUND(
          (
            COALESCE((SELECT SUM(seconds_on_trip) FROM trip_usage), 0)
            / (a.cnt * b.period_secs)
          ) * 100,
          2
        )
      ELSE 0
    END AS utilization_percent
  FROM active a
  CROSS JOIN bounds b;
$$;

-- ---------------------------------------------------------------------------
-- Parameterized per-vehicle ROI for a date window
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_vehicle_roi(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  vehicle_id INTEGER,
  registration_number VARCHAR,
  name_model VARCHAR,
  acquisition_cost NUMERIC,
  total_revenue NUMERIC,
  fuel_cost NUMERIC,
  maintenance_cost NUMERIC,
  net_profit NUMERIC,
  roi_percent NUMERIC,
  completed_trips BIGINT
)
LANGUAGE sql
STABLE
AS $$
  WITH filtered_trips AS (
    SELECT t.*
    FROM trips t
    WHERE t.status = 'Completed'
      AND t.vehicle_id IS NOT NULL
      AND (p_start_date IS NULL OR t.completed_at::DATE >= p_start_date)
      AND (p_end_date IS NULL OR t.completed_at::DATE <= p_end_date)
  ),
  trip_revenue AS (
    SELECT
      vehicle_id,
      SUM(resolved_trip_revenue(t)) AS total_revenue,
      COUNT(*) AS completed_trips
    FROM filtered_trips t
    GROUP BY vehicle_id
  ),
  fuel AS (
    SELECT fl.vehicle_id, SUM(fl.cost) AS fuel_cost
    FROM fuel_logs fl
    WHERE (p_start_date IS NULL OR fl.logged_at >= p_start_date)
      AND (p_end_date IS NULL OR fl.logged_at <= p_end_date)
    GROUP BY fl.vehicle_id
  ),
  maintenance AS (
    SELECT ml.vehicle_id, SUM(ml.cost) AS maintenance_cost
    FROM maintenance_logs ml
    WHERE (p_start_date IS NULL OR ml.started_at::DATE >= p_start_date)
      AND (p_end_date IS NULL OR COALESCE(ml.closed_at, ml.started_at)::DATE <= p_end_date)
    GROUP BY ml.vehicle_id
  )
  SELECT
    v.id AS vehicle_id,
    v.registration_number,
    v.name_model,
    v.acquisition_cost,
    COALESCE(tr.total_revenue, 0) AS total_revenue,
    COALESCE(f.fuel_cost, 0) AS fuel_cost,
    COALESCE(m.maintenance_cost, 0) AS maintenance_cost,
    COALESCE(tr.total_revenue, 0) - COALESCE(f.fuel_cost, 0) - COALESCE(m.maintenance_cost, 0) AS net_profit,
    CASE
      WHEN v.acquisition_cost > 0 THEN
        ROUND(
          (
            (COALESCE(tr.total_revenue, 0) - COALESCE(f.fuel_cost, 0) - COALESCE(m.maintenance_cost, 0))
            / v.acquisition_cost
          ) * 100,
          2
        )
      ELSE NULL
    END AS roi_percent,
    COALESCE(tr.completed_trips, 0) AS completed_trips
  FROM vehicles v
  LEFT JOIN trip_revenue tr ON tr.vehicle_id = v.id
  LEFT JOIN fuel f ON f.vehicle_id = v.id
  LEFT JOIN maintenance m ON m.vehicle_id = v.id
  WHERE v.status <> 'Retired'
  ORDER BY roi_percent DESC NULLS LAST, v.registration_number;
$$;

COMMIT;
