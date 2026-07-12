-- =============================================================================
-- TransitOps — Seed data (roles + demo admin user)
-- Run after schema.sql
-- Default admin password: Admin@123 (bcrypt hash below)
-- =============================================================================

BEGIN;

INSERT INTO roles (name, description) VALUES
  ('Fleet Manager',     'Oversees fleet assets, maintenance, and operational efficiency'),
  ('Driver',            'Creates trips and monitors active deliveries'),
  ('Safety Officer',    'Ensures driver compliance and license validity'),
  ('Financial Analyst', 'Reviews operational expenses and profitability')
ON CONFLICT (name) DO NOTHING;

-- bcrypt hash for 'Admin@123' (cost factor 10)
INSERT INTO users (email, password_hash, full_name, role_id)
SELECT
  'admin@transitops.local',
  '$2b$10$T9OWSv6XfTz4we38LVSqmOWkBslJtYYtOxQZx.Kr5y6fvhrTLxyj2',
  'System Administrator',
  r.id
FROM roles r
WHERE r.name = 'Fleet Manager'
ON CONFLICT (email) DO NOTHING;

COMMIT;
