/**
 * TransitOps — idempotent SQL migration runner for cloud deploys.
 * Role 9: Krish — used by Render/Railway preDeployCommand.
 *
 * Usage:
 *   node scripts/run-migrations.js
 *
 * Env:
 *   DATABASE_URL or DB_* vars (see config/db.js)
 *   RUN_SEED=true  — apply seed.sql on empty DB (recommended for first deploy)
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

const ROOT = path.join(__dirname, '..', 'database');

const MIGRATIONS = [
  {
    version: '002_indexes_and_constraints',
    file: 'migrations/002_indexes_and_constraints.sql',
  },
  {
    version: '003_analytics_aggregations',
    file: 'migrations/003_analytics_aggregations.sql',
  },
];

async function tableExists(tableName) {
  const { rows } = await pool.query(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = $1
     ) AS exists`,
    [tableName]
  );

  return rows[0].exists;
}

async function migrationApplied(version) {
  const hasTracker = await tableExists('schema_migrations');
  if (!hasTracker) return false;

  const { rows } = await pool.query(
    'SELECT 1 FROM schema_migrations WHERE version = $1 LIMIT 1',
    [version]
  );

  return rows.length > 0;
}

async function runSqlFile(relativePath, label) {
  const filePath = path.join(ROOT, relativePath);
  const sql = fs.readFileSync(filePath, 'utf8');

  console.log(`[migrate] applying ${label}...`);
  await pool.query(sql);
  console.log(`[migrate] ✓ ${label}`);
}

async function main() {
  try {
    const rolesExist = await tableExists('roles');

    if (!rolesExist) {
      await runSqlFile('schema.sql', 'schema.sql');

      if (process.env.RUN_SEED === 'true' || process.env.NODE_ENV !== 'production') {
        await runSqlFile('seed.sql', 'seed.sql');
      } else {
        console.log('[migrate] skipping seed.sql (set RUN_SEED=true for first production deploy)');
      }
    }

    for (const migration of MIGRATIONS) {
      const applied = await migrationApplied(migration.version);
      if (applied) {
        console.log(`[migrate] skip ${migration.version} (already applied)`);
        continue;
      }

      await runSqlFile(migration.file, migration.version);
    }

    console.log('[migrate] all migrations complete');
  } catch (error) {
    console.error('[migrate] failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
