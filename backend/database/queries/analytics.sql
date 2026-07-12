-- =============================================================================
-- TransitOps — Analytics Query Reference
-- Role 9: Krish — Fleet Utilization & Vehicle ROI
--
-- Requires migration 003_analytics_aggregations.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Fleet Utilization % (time-on-trip over a date window)
--    Formula: SUM(trip active seconds) / (active fleet × period seconds) × 100
-- ---------------------------------------------------------------------------
SELECT *
FROM get_fleet_utilization(
  CURRENT_DATE - INTERVAL '30 days',
  CURRENT_DATE
);

-- Last 7 days
SELECT *
FROM get_fleet_utilization(CURRENT_DATE - 7, CURRENT_DATE);

-- ---------------------------------------------------------------------------
-- 2. Fleet Utilization snapshot (current + 30-day activity)
-- ---------------------------------------------------------------------------
SELECT *
FROM fleet_utilization_current;

-- ---------------------------------------------------------------------------
-- 3. Vehicle ROI — all time
--    Formula: (Revenue - (Maintenance + Fuel)) / Acquisition Cost × 100
-- ---------------------------------------------------------------------------
SELECT
  registration_number,
  total_revenue,
  fuel_cost,
  maintenance_cost,
  net_profit,
  roi_percent,
  completed_trips
FROM vehicle_roi_summary
ORDER BY roi_percent DESC NULLS LAST;

-- ---------------------------------------------------------------------------
-- 4. Vehicle ROI — filtered by completion date (Q1 example)
-- ---------------------------------------------------------------------------
SELECT *
FROM get_vehicle_roi('2026-01-01'::DATE, '2026-03-31'::DATE);

-- ---------------------------------------------------------------------------
-- 5. Combined dashboard KPI (single round-trip)
-- ---------------------------------------------------------------------------
WITH utilization AS (
  SELECT * FROM get_fleet_utilization(CURRENT_DATE - 30, CURRENT_DATE)
),
roi AS (
  SELECT
    COUNT(*) AS vehicles_tracked,
    ROUND(AVG(roi_percent), 2) AS avg_roi_percent,
    ROUND(SUM(total_revenue), 2) AS fleet_revenue,
    ROUND(SUM(fuel_cost + maintenance_cost), 2) AS fleet_operating_cost
  FROM get_vehicle_roi(CURRENT_DATE - 30, CURRENT_DATE)
  WHERE roi_percent IS NOT NULL
)
SELECT
  u.utilization_percent AS fleet_utilization_percent,
  u.utilized_vehicles,
  u.active_fleet,
  r.avg_roi_percent,
  r.fleet_revenue,
  r.fleet_operating_cost
FROM utilization u
CROSS JOIN roi r;

-- ---------------------------------------------------------------------------
-- 6. Top / bottom performers by ROI
-- ---------------------------------------------------------------------------
SELECT registration_number, roi_percent, net_profit
FROM vehicle_roi_summary
WHERE acquisition_cost > 0
ORDER BY roi_percent DESC
LIMIT 5;

SELECT registration_number, roi_percent, net_profit
FROM vehicle_roi_summary
WHERE acquisition_cost > 0
ORDER BY roi_percent ASC NULLS FIRST
LIMIT 5;
