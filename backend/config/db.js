/**
 * TransitOps — PostgreSQL connection pool (pg)
 * Role 1: Lead Backend & Database Architect (Krish)
 *
 * Usage in Express:
 *   const { pool, query, getClient, healthCheck, closePool } = require('./config/db');
 */

const { Pool } = require('pg');

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'transitops',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',

  // Pool sizing (pg maintains up to max idle connections)
  max: Number(process.env.DB_POOL_MAX) || 20,
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS) || 30_000,
  connectionTimeoutMillis: Number(process.env.DB_CONN_TIMEOUT_MS) || 5_000,

  // Recycle connections periodically (helps with long-lived cloud DB proxies)
  maxUses: Number(process.env.DB_MAX_USES) || 7_500,

  ssl:
    process.env.DB_SSL === 'true'
      ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
      : false,
};

const pool = new Pool(poolConfig);

pool.on('connect', (client) => {
  client.query("SET TIME ZONE 'UTC'");
});

pool.on('error', (err) => {
  console.error('[TransitOps DB] Unexpected idle client error:', err.message);
});

/**
 * Run a parameterized query against the pool.
 * @param {string} text - SQL statement
 * @param {Array} [params] - Bind parameters
 */
async function query(text, params = []) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    if (process.env.DB_LOG_QUERIES === 'true') {
      console.debug('[TransitOps DB]', { durationMs: Date.now() - start, rows: result.rowCount });
    }
    return result;
  } catch (err) {
    err.query = text;
    throw err;
  }
}

/**
 * Acquire a dedicated client for transactions.
 * Always release in a finally block: client.release()
 */
async function getClient() {
  const client = await pool.connect();
  const originalRelease = client.release.bind(client);

  let released = false;
  client.release = () => {
    if (released) return;
    released = true;
    return originalRelease();
  };

  return client;
}

/**
 * Execute a callback inside a transaction (COMMIT / ROLLBACK).
 * @param {(client: import('pg').PoolClient) => Promise<T>} fn
 * @returns {Promise<T>}
 */
async function withTransaction(fn) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Lightweight readiness probe for health endpoints */
async function healthCheck() {
  const { rows } = await pool.query('SELECT NOW() AS server_time, current_database() AS database');
  return {
    ok: true,
    database: rows[0].database,
    serverTime: rows[0].server_time,
    pool: {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
    },
  };
}

/** Graceful shutdown — call from SIGTERM / SIGINT handlers */
async function closePool() {
  await pool.end();
}

module.exports = {
  pool,
  query,
  getClient,
  withTransaction,
  healthCheck,
  closePool,
};
