-- =============================================================================
-- TransitOps Migration 004
-- Convert legacy USD monetary values to Indian Rupees (INR)
--
-- Exchange rate: 1 USD = 83 INR
-- Only runs when fleet costs look USD-scaled (max acquisition < ₹5,00,000).
--
-- Run: psql -U postgres -d transitops -f database/migrations/004_usd_to_inr.sql
-- =============================================================================

BEGIN;

INSERT INTO schema_migrations (version, description)
VALUES (
  '004_usd_to_inr',
  'Convert legacy USD amounts to INR at rate 83 for vehicles, trips, fuel, maintenance, expenses'
)
ON CONFLICT (version) DO NOTHING;

DO $$
DECLARE
  usd_to_inr CONSTANT NUMERIC := 83;
  max_acquisition NUMERIC;
BEGIN
  SELECT COALESCE(MAX(acquisition_cost), 0) INTO max_acquisition FROM vehicles;

  -- Skip if data already appears to be stored in INR (e.g. lakh-scale acquisition costs).
  IF max_acquisition >= 500000 THEN
    RAISE NOTICE 'Skipping USD→INR conversion: acquisition costs already INR-scale (max=%).', max_acquisition;
    RETURN;
  END IF;

  UPDATE vehicles
     SET acquisition_cost = ROUND(acquisition_cost * usd_to_inr, 2)
   WHERE acquisition_cost > 0;

  UPDATE trips
     SET revenue = ROUND(revenue * usd_to_inr, 2)
   WHERE revenue IS NOT NULL AND revenue > 0;

  UPDATE fuel_logs
     SET cost = ROUND(cost * usd_to_inr, 2)
   WHERE cost > 0;

  UPDATE maintenance_logs
     SET cost = ROUND(cost * usd_to_inr, 2)
   WHERE cost > 0;

  UPDATE expenses
     SET amount = ROUND(amount * usd_to_inr, 2)
   WHERE amount > 0;

  RAISE NOTICE 'Converted USD amounts to INR at rate %.', usd_to_inr;
END $$;

COMMIT;
