-- =============================================================================
-- TransitOps — Demo fleet seed (PDF example workflow)
-- Van-05 + driver Alex — run after schema.sql + seed.sql
-- =============================================================================

BEGIN;

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
  'Van-05',
  'Ford Transit',
  'Van',
  500,
  12000,
  2075000,
  'Available',
  'North'
)
ON CONFLICT (registration_number) DO NOTHING;

INSERT INTO drivers (
  full_name,
  license_number,
  license_category,
  license_expiry,
  contact_number,
  safety_score,
  status
)
VALUES (
  'Alex',
  'DL-ALEX-001',
  'B',
  (CURRENT_DATE + INTERVAL '365 days')::DATE,
  '+919876543210',
  95,
  'Available'
)
ON CONFLICT (license_number) DO NOTHING;

COMMIT;
