-- =============================================================================
-- TransitOps Migration 002
-- Role 5: Krish — Database Constraints & Indexing
--
-- Run after schema.sql:
--   psql -U postgres -d transitops -f database/migrations/002_indexes_and_constraints.sql
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Migration tracking
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schema_migrations (
  id          SERIAL PRIMARY KEY,
  version     VARCHAR(100) NOT NULL,
  description TEXT,
  applied_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_schema_migrations_version UNIQUE (version)
);

-- ---------------------------------------------------------------------------
-- Registration number normalization (case/whitespace insensitive uniqueness)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION normalize_registration_number(reg TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
  SELECT UPPER(BTRIM(reg));
$$;

COMMENT ON FUNCTION normalize_registration_number(TEXT) IS
  'Normalizes vehicle registration numbers for consistent uniqueness checks.';

CREATE OR REPLACE FUNCTION trg_normalize_vehicle_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.registration_number := normalize_registration_number(NEW.registration_number);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vehicles_normalize_registration ON vehicles;

CREATE TRIGGER trg_vehicles_normalize_registration
  BEFORE INSERT OR UPDATE OF registration_number ON vehicles
  FOR EACH ROW
  EXECUTE PROCEDURE trg_normalize_vehicle_registration();

-- Functional unique index — prevents VAN-05 vs van-05 vs " VAN-05 "
CREATE UNIQUE INDEX IF NOT EXISTS uq_vehicles_registration_normalized
  ON vehicles (normalize_registration_number(registration_number));

-- ---------------------------------------------------------------------------
-- Index optimizations — vehicle status queries (dashboard + dispatch pool)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_vehicles_status_region
  ON vehicles (status, region);

CREATE INDEX IF NOT EXISTS idx_vehicles_status_type
  ON vehicles (status, vehicle_type);

CREATE INDEX IF NOT EXISTS idx_vehicles_status_created_at
  ON vehicles (status, created_at DESC);

-- Partial index: vehicles eligible for trip dispatch
CREATE INDEX IF NOT EXISTS idx_vehicles_dispatch_available
  ON vehicles (id, registration_number, max_load_capacity_kg, vehicle_type, region)
  WHERE status = 'Available';

-- Partial index: vehicles in maintenance (KPI + filtering)
CREATE INDEX IF NOT EXISTS idx_vehicles_in_shop
  ON vehicles (id, registration_number, updated_at DESC)
  WHERE status = 'In Shop';

-- ---------------------------------------------------------------------------
-- Index optimizations — driver status queries (compliance + dispatch)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_drivers_status_expiry
  ON drivers (status, license_expiry);

CREATE INDEX IF NOT EXISTS idx_drivers_status_safety_score
  ON drivers (status, safety_score DESC);

-- Partial index: drivers eligible for trip assignment
CREATE INDEX IF NOT EXISTS idx_drivers_dispatch_available
  ON drivers (id, full_name, license_number, license_expiry)
  WHERE status = 'Available';

-- Partial index: suspended / compliance monitoring
CREATE INDEX IF NOT EXISTS idx_drivers_suspended
  ON drivers (id, full_name, license_expiry)
  WHERE status = 'Suspended';

-- Index for license expiry compliance reports (filter expiry in queries)
CREATE INDEX IF NOT EXISTS idx_drivers_license_expiring
  ON drivers (license_expiry ASC, status, full_name);

-- ---------------------------------------------------------------------------
-- Index optimizations — trip lifecycle states
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_trips_status_created_at
  ON trips (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trips_status_vehicle
  ON trips (status, vehicle_id);

CREATE INDEX IF NOT EXISTS idx_trips_status_driver
  ON trips (status, driver_id);

-- Partial index: active trip pipeline (Draft + Dispatched)
CREATE INDEX IF NOT EXISTS idx_trips_active_lifecycle
  ON trips (status, dispatched_at DESC, vehicle_id, driver_id)
  WHERE status IN ('Draft', 'Dispatched');

-- Partial index: completed trips for analytics
CREATE INDEX IF NOT EXISTS idx_trips_completed_analytics
  ON trips (completed_at DESC, vehicle_id, fuel_consumed_liters, actual_distance_km)
  WHERE status = 'Completed';

-- Partial index: pending trips KPI
CREATE INDEX IF NOT EXISTS idx_trips_pending
  ON trips (created_at DESC, source, destination)
  WHERE status = 'Draft';

-- ---------------------------------------------------------------------------
-- Graceful registration conflict handling at database layer
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION register_vehicle_safe(
  p_registration_number TEXT,
  p_name_model           TEXT,
  p_vehicle_type         TEXT,
  p_max_load_capacity_kg NUMERIC,
  p_odometer_km          NUMERIC DEFAULT 0,
  p_acquisition_cost     NUMERIC DEFAULT 0,
  p_status               vehicle_status DEFAULT 'Available',
  p_region               TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_normalized_reg TEXT;
  v_vehicle        vehicles%ROWTYPE;
BEGIN
  v_normalized_reg := normalize_registration_number(p_registration_number);

  IF v_normalized_reg IS NULL OR v_normalized_reg = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'conflict', false,
      'code', 'INVALID_REGISTRATION',
      'message', 'Registration number is required.'
    );
  END IF;

  INSERT INTO vehicles (
    registration_number,
    name_model,
    vehicle_type,
    max_load_capacity_kg,
    odometer_km,
    acquisition_cost,
    status,
    region
  )
  VALUES (
    v_normalized_reg,
    p_name_model,
    p_vehicle_type,
    p_max_load_capacity_kg,
    COALESCE(p_odometer_km, 0),
    COALESCE(p_acquisition_cost, 0),
    COALESCE(p_status, 'Available'),
    p_region
  )
  RETURNING * INTO v_vehicle;

  RETURN jsonb_build_object(
    'success', true,
    'conflict', false,
    'code', 'CREATED',
    'message', 'Vehicle registered successfully.',
    'vehicle', jsonb_build_object(
      'id', v_vehicle.id,
      'registrationNumber', v_vehicle.registration_number,
      'nameModel', v_vehicle.name_model,
      'status', v_vehicle.status
    )
  );

EXCEPTION
  WHEN unique_violation THEN
    SELECT *
      INTO v_vehicle
      FROM vehicles
     WHERE normalize_registration_number(registration_number) = v_normalized_reg
     LIMIT 1;

    RETURN jsonb_build_object(
      'success', false,
      'conflict', true,
      'code', 'DUPLICATE_REGISTRATION',
      'message', format(
        'Vehicle registration number "%s" already exists (vehicle id: %s).',
        v_normalized_reg,
        COALESCE(v_vehicle.id::TEXT, 'unknown')
      ),
      'existingVehicle', CASE
        WHEN v_vehicle.id IS NULL THEN NULL
        ELSE jsonb_build_object(
          'id', v_vehicle.id,
          'registrationNumber', v_vehicle.registration_number,
          'nameModel', v_vehicle.name_model,
          'status', v_vehicle.status
        )
      END
    );
END;
$$;

COMMENT ON FUNCTION register_vehicle_safe IS
  'Inserts a vehicle and returns structured JSON instead of raising raw unique_violation errors.';

-- ---------------------------------------------------------------------------
-- Record migration
-- ---------------------------------------------------------------------------
INSERT INTO schema_migrations (version, description)
VALUES (
  '002_indexes_and_constraints',
  'Add composite/partial indexes and graceful vehicle registration conflict handling'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;
