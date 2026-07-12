-- =============================================================================
-- TransitOps — Production PostgreSQL Schema
-- Role 1: Lead Backend & Database Architect (Krish)
-- Fleet management: users, roles, vehicles, drivers, trips, maintenance,
-- fuel logs, and expenses with enforced business rules.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Custom ENUM types
-- ---------------------------------------------------------------------------
CREATE TYPE vehicle_status AS ENUM (
  'Available',
  'On Trip',
  'In Shop',
  'Retired'
);

CREATE TYPE driver_status AS ENUM (
  'Available',
  'On Trip',
  'Off Duty',
  'Suspended'
);

CREATE TYPE trip_status AS ENUM (
  'Draft',
  'Dispatched',
  'Completed',
  'Cancelled'
);

CREATE TYPE maintenance_status AS ENUM (
  'Active',
  'Closed'
);

CREATE TYPE expense_category AS ENUM (
  'Toll',
  'Maintenance',
  'Fuel',
  'Other'
);

-- ---------------------------------------------------------------------------
-- Roles (RBAC)
-- ---------------------------------------------------------------------------
CREATE TABLE roles (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(50)  NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_roles_name UNIQUE (name)
);

COMMENT ON TABLE roles IS 'RBAC roles: Fleet Manager, Driver, Safety Officer, Financial Analyst';

-- ---------------------------------------------------------------------------
-- Users (Authentication)
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(150) NOT NULL,
  role_id       INTEGER      NOT NULL,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_users_email UNIQUE (email),
  CONSTRAINT fk_users_role
    FOREIGN KEY (role_id) REFERENCES roles (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);

CREATE INDEX idx_users_role_id ON users (role_id);
CREATE INDEX idx_users_is_active ON users (is_active);

-- ---------------------------------------------------------------------------
-- Vehicles
-- ---------------------------------------------------------------------------
CREATE TABLE vehicles (
  id                   SERIAL PRIMARY KEY,
  registration_number  VARCHAR(20)    NOT NULL,
  name_model           VARCHAR(100)   NOT NULL,
  vehicle_type         VARCHAR(50)    NOT NULL,
  max_load_capacity_kg NUMERIC(10, 2) NOT NULL,
  odometer_km          NUMERIC(12, 2) NOT NULL DEFAULT 0,
  acquisition_cost     NUMERIC(14, 2) NOT NULL,
  status               vehicle_status NOT NULL DEFAULT 'Available',
  region               VARCHAR(100),
  created_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_vehicles_registration_number UNIQUE (registration_number),
  CONSTRAINT chk_vehicles_max_load_positive CHECK (max_load_capacity_kg > 0),
  CONSTRAINT chk_vehicles_odometer_non_negative CHECK (odometer_km >= 0),
  CONSTRAINT chk_vehicles_acquisition_cost_non_negative CHECK (acquisition_cost >= 0)
);

CREATE INDEX idx_vehicles_status ON vehicles (status);
CREATE INDEX idx_vehicles_type ON vehicles (vehicle_type);
CREATE INDEX idx_vehicles_region ON vehicles (region);

-- ---------------------------------------------------------------------------
-- Drivers
-- ---------------------------------------------------------------------------
CREATE TABLE drivers (
  id               SERIAL PRIMARY KEY,
  full_name        VARCHAR(150)   NOT NULL,
  license_number   VARCHAR(50)    NOT NULL,
  license_category VARCHAR(20)    NOT NULL,
  license_expiry   DATE           NOT NULL,
  contact_number   VARCHAR(20)    NOT NULL,
  safety_score     NUMERIC(5, 2)  NOT NULL DEFAULT 100.00,
  status           driver_status  NOT NULL DEFAULT 'Available',
  user_id          INTEGER,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_drivers_license_number UNIQUE (license_number),
  CONSTRAINT uq_drivers_user_id UNIQUE (user_id),
  CONSTRAINT chk_drivers_safety_score_range
    CHECK (safety_score >= 0 AND safety_score <= 100),
  CONSTRAINT fk_drivers_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
);

CREATE INDEX idx_drivers_status ON drivers (status);
CREATE INDEX idx_drivers_license_expiry ON drivers (license_expiry);

-- ---------------------------------------------------------------------------
-- Trips
-- ---------------------------------------------------------------------------
CREATE TABLE trips (
  id                  SERIAL PRIMARY KEY,
  source              VARCHAR(255)   NOT NULL,
  destination         VARCHAR(255)   NOT NULL,
  vehicle_id          INTEGER,
  driver_id           INTEGER,
  cargo_weight_kg     NUMERIC(10, 2) NOT NULL,
  planned_distance_km NUMERIC(10, 2) NOT NULL,
  actual_distance_km  NUMERIC(10, 2),
  final_odometer_km   NUMERIC(12, 2),
  fuel_consumed_liters NUMERIC(10, 2),
  status              trip_status    NOT NULL DEFAULT 'Draft',
  dispatched_at       TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  created_by          INTEGER,
  created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_trips_cargo_weight_positive CHECK (cargo_weight_kg > 0),
  CONSTRAINT chk_trips_planned_distance_positive CHECK (planned_distance_km > 0),
  CONSTRAINT chk_trips_actual_distance_non_negative
    CHECK (actual_distance_km IS NULL OR actual_distance_km >= 0),
  CONSTRAINT chk_trips_final_odometer_non_negative
    CHECK (final_odometer_km IS NULL OR final_odometer_km >= 0),
  CONSTRAINT chk_trips_fuel_consumed_non_negative
    CHECK (fuel_consumed_liters IS NULL OR fuel_consumed_liters >= 0),
  CONSTRAINT fk_trips_vehicle
    FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_trips_driver
    FOREIGN KEY (driver_id) REFERENCES drivers (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_trips_created_by
    FOREIGN KEY (created_by) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
);

CREATE INDEX idx_trips_status ON trips (status);
CREATE INDEX idx_trips_vehicle_id ON trips (vehicle_id);
CREATE INDEX idx_trips_driver_id ON trips (driver_id);
CREATE INDEX idx_trips_created_at ON trips (created_at DESC);

-- ---------------------------------------------------------------------------
-- Maintenance Logs
-- ---------------------------------------------------------------------------
CREATE TABLE maintenance_logs (
  id          SERIAL PRIMARY KEY,
  vehicle_id  INTEGER             NOT NULL,
  title       VARCHAR(150)        NOT NULL,
  description TEXT,
  cost        NUMERIC(12, 2)      NOT NULL DEFAULT 0,
  status      maintenance_status  NOT NULL DEFAULT 'Active',
  started_at  TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  closed_at   TIMESTAMPTZ,
  created_by  INTEGER,
  created_at  TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_maintenance_cost_non_negative CHECK (cost >= 0),
  CONSTRAINT chk_maintenance_closed_after_started
    CHECK (closed_at IS NULL OR closed_at >= started_at),
  CONSTRAINT fk_maintenance_vehicle
    FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_maintenance_created_by
    FOREIGN KEY (created_by) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
);

CREATE INDEX idx_maintenance_vehicle_id ON maintenance_logs (vehicle_id);
CREATE INDEX idx_maintenance_status ON maintenance_logs (status);

-- ---------------------------------------------------------------------------
-- Fuel Logs
-- ---------------------------------------------------------------------------
CREATE TABLE fuel_logs (
  id          SERIAL PRIMARY KEY,
  vehicle_id  INTEGER        NOT NULL,
  trip_id     INTEGER,
  liters      NUMERIC(10, 2) NOT NULL,
  cost        NUMERIC(12, 2) NOT NULL,
  logged_at   DATE           NOT NULL DEFAULT CURRENT_DATE,
  odometer_km NUMERIC(12, 2),
  created_by  INTEGER,
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_fuel_liters_positive CHECK (liters > 0),
  CONSTRAINT chk_fuel_cost_non_negative CHECK (cost >= 0),
  CONSTRAINT chk_fuel_odometer_non_negative
    CHECK (odometer_km IS NULL OR odometer_km >= 0),
  CONSTRAINT fk_fuel_vehicle
    FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_fuel_trip
    FOREIGN KEY (trip_id) REFERENCES trips (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT fk_fuel_created_by
    FOREIGN KEY (created_by) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
);

CREATE INDEX idx_fuel_logs_vehicle_id ON fuel_logs (vehicle_id);
CREATE INDEX idx_fuel_logs_trip_id ON fuel_logs (trip_id);
CREATE INDEX idx_fuel_logs_logged_at ON fuel_logs (logged_at DESC);

-- ---------------------------------------------------------------------------
-- Expenses
-- ---------------------------------------------------------------------------
CREATE TABLE expenses (
  id           SERIAL PRIMARY KEY,
  vehicle_id   INTEGER           NOT NULL,
  trip_id      INTEGER,
  category     expense_category  NOT NULL,
  amount       NUMERIC(12, 2)    NOT NULL,
  description  TEXT,
  expense_date DATE              NOT NULL DEFAULT CURRENT_DATE,
  created_by   INTEGER,
  created_at   TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_expenses_amount_non_negative CHECK (amount >= 0),
  CONSTRAINT fk_expenses_vehicle
    FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_expenses_trip
    FOREIGN KEY (trip_id) REFERENCES trips (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT fk_expenses_created_by
    FOREIGN KEY (created_by) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
);

CREATE INDEX idx_expenses_vehicle_id ON expenses (vehicle_id);
CREATE INDEX idx_expenses_trip_id ON expenses (trip_id);
CREATE INDEX idx_expenses_category ON expenses (category);
CREATE INDEX idx_expenses_expense_date ON expenses (expense_date DESC);

-- ---------------------------------------------------------------------------
-- Utility: auto-update updated_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER trg_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER trg_drivers_updated_at
  BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER trg_trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER trg_maintenance_logs_updated_at
  BEFORE UPDATE ON maintenance_logs
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ---------------------------------------------------------------------------
-- Business rule: cargo weight must not exceed vehicle capacity on dispatch
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_trip_dispatch()
RETURNS TRIGGER AS $$
DECLARE
  v_status   vehicle_status;
  v_capacity NUMERIC(10, 2);
  d_status   driver_status;
  d_expiry   DATE;
BEGIN
  IF NEW.status = 'Dispatched' AND (OLD.status IS DISTINCT FROM 'Dispatched') THEN
    IF NEW.vehicle_id IS NULL OR NEW.driver_id IS NULL THEN
      RAISE EXCEPTION 'Vehicle and driver are required before dispatch';
    END IF;

    SELECT status, max_load_capacity_kg
      INTO v_status, v_capacity
      FROM vehicles
     WHERE id = NEW.vehicle_id;

    IF v_status NOT IN ('Available') THEN
      RAISE EXCEPTION 'Vehicle % is not available for dispatch (status: %)', NEW.vehicle_id, v_status;
    END IF;

    IF NEW.cargo_weight_kg > v_capacity THEN
      RAISE EXCEPTION 'Cargo weight (%) exceeds vehicle capacity (%)', NEW.cargo_weight_kg, v_capacity;
    END IF;

    SELECT status, license_expiry
      INTO d_status, d_expiry
      FROM drivers
     WHERE id = NEW.driver_id;

    IF d_status = 'Suspended' OR d_status = 'On Trip' THEN
      RAISE EXCEPTION 'Driver % cannot be assigned (status: %)', NEW.driver_id, d_status;
    END IF;

    IF d_expiry < CURRENT_DATE THEN
      RAISE EXCEPTION 'Driver % license expired on %', NEW.driver_id, d_expiry;
    END IF;

    NEW.dispatched_at = COALESCE(NEW.dispatched_at, NOW());

    UPDATE vehicles SET status = 'On Trip' WHERE id = NEW.vehicle_id;
    UPDATE drivers  SET status = 'On Trip' WHERE id = NEW.driver_id;
  END IF;

  IF NEW.status = 'Completed' AND (OLD.status IS DISTINCT FROM 'Completed') THEN
    IF OLD.status <> 'Dispatched' THEN
      RAISE EXCEPTION 'Only dispatched trips can be completed';
    END IF;

    NEW.completed_at = COALESCE(NEW.completed_at, NOW());

    UPDATE vehicles
       SET status = 'Available',
           odometer_km = COALESCE(NEW.final_odometer_km, odometer_km)
     WHERE id = NEW.vehicle_id
       AND status <> 'Retired';

    UPDATE drivers SET status = 'Available' WHERE id = NEW.driver_id;
  END IF;

  IF NEW.status = 'Cancelled' AND (OLD.status IS DISTINCT FROM 'Cancelled') THEN
    IF OLD.status = 'Dispatched' THEN
      UPDATE vehicles
         SET status = 'Available'
       WHERE id = NEW.vehicle_id
         AND status <> 'Retired';

      UPDATE drivers SET status = 'Available' WHERE id = NEW.driver_id;
    END IF;

    NEW.cancelled_at = COALESCE(NEW.cancelled_at, NOW());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_trips_status_transitions
  BEFORE UPDATE OF status ON trips
  FOR EACH ROW EXECUTE PROCEDURE validate_trip_dispatch();

-- ---------------------------------------------------------------------------
-- Business rule: maintenance toggles vehicle status
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_maintenance_status()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'Active' THEN
    UPDATE vehicles
       SET status = 'In Shop'
     WHERE id = NEW.vehicle_id
       AND status <> 'Retired';
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.status = 'Closed'
     AND OLD.status = 'Active' THEN
    NEW.closed_at = COALESCE(NEW.closed_at, NOW());

    UPDATE vehicles
       SET status = 'Available'
     WHERE id = NEW.vehicle_id
       AND status = 'In Shop';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_maintenance_status
  AFTER INSERT OR UPDATE OF status ON maintenance_logs
  FOR EACH ROW EXECUTE PROCEDURE handle_maintenance_status();

-- ---------------------------------------------------------------------------
-- Analytics view: operational cost per vehicle
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW vehicle_operational_costs AS
SELECT
  v.id AS vehicle_id,
  v.registration_number,
  COALESCE(f.total_fuel_cost, 0) AS fuel_cost,
  COALESCE(m.total_maintenance_cost, 0) AS maintenance_cost,
  COALESCE(e.total_other_expenses, 0) AS other_expenses,
  COALESCE(f.total_fuel_cost, 0)
    + COALESCE(m.total_maintenance_cost, 0)
    + COALESCE(e.total_other_expenses, 0) AS total_operational_cost
FROM vehicles v
LEFT JOIN (
  SELECT vehicle_id, SUM(cost) AS total_fuel_cost
  FROM fuel_logs
  GROUP BY vehicle_id
) f ON f.vehicle_id = v.id
LEFT JOIN (
  SELECT vehicle_id, SUM(cost) AS total_maintenance_cost
  FROM maintenance_logs
  GROUP BY vehicle_id
) m ON m.vehicle_id = v.id
LEFT JOIN (
  SELECT vehicle_id, SUM(amount) AS total_other_expenses
  FROM expenses
  WHERE category <> 'Fuel'
  GROUP BY vehicle_id
) e ON e.vehicle_id = v.id;

COMMIT;
