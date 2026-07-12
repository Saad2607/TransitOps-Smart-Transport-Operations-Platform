/**
 * TransitOps — Secure Express server.
 * Role 2: Saad — JWT Authentication + RBAC.
 */

require('dotenv').config();

const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const { healthCheck, closePool } = require('./config/db');
const { notFoundHandler, globalErrorHandler } = require('./middleware/error.middleware');
const apiRoutes = require('./routes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json({ limit: '10kb' }));

app.get('/api/health', async (_req, res) => {
  try {
    const db = await healthCheck();
    res.json({ success: true, status: 'ok', db });
  } catch (err) {
    res.status(503).json({
      success: false,
      status: 'error',
      message: err.message,
    });
  }
});

app.use('/api', apiRoutes);

app.use(notFoundHandler);
app.use(globalErrorHandler);

const server = app.listen(PORT, () => {
  console.log(`[TransitOps] API running on http://localhost:${PORT}`);
});

async function shutdown(signal) {
  console.log(`[TransitOps] ${signal} received. Closing server and DB pool.`);
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;
