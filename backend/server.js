/**
 * TransitOps — Express bootstrap with DB pool lifecycle
 * Minimal entry point demonstrating pool initialization (Role 1).
 */

require('dotenv').config();

const express = require('express');
const { healthCheck, closePool } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    const db = await healthCheck();
    res.json({ status: 'ok', db });
  } catch (err) {
    res.status(503).json({ status: 'error', message: err.message });
  }
});

const server = app.listen(PORT, () => {
  console.log(`[TransitOps] API listening on port ${PORT}`);
});

async function shutdown(signal) {
  console.log(`[TransitOps] ${signal} received — closing server and DB pool`);
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;
