const AppError = require('../utils/AppError');

function notFoundHandler(req, _res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

function getDatabaseErrorMessage(err) {
  const code = err.code || err.errors?.[0]?.code;

  if (code === 'ECONNREFUSED') {
    return 'Database connection refused. Start PostgreSQL and verify DB_HOST/DB_PORT in .env.';
  }

  if (code === '3D000') {
    return `Database "${process.env.DB_NAME || 'transitops'}" does not exist. Run database/schema.sql first.`;
  }

  if (code === '28P01') {
    return 'Database authentication failed. Check DB_USER and DB_PASSWORD in .env.';
  }

  return null;
}

// Express requires four args for error middleware.
// eslint-disable-next-line no-unused-vars
function globalErrorHandler(err, _req, res, _next) {
  const dbMessage = getDatabaseErrorMessage(err);
  const statusCode = dbMessage ? 503 : err.statusCode || 500;
  const isDev = process.env.NODE_ENV !== 'production';

  if (statusCode >= 500) {
    console.error('[TransitOps Error]', err);
  }

  res.status(statusCode).json({
    success: false,
    message: dbMessage || err.message || 'Internal server error',
    ...(err.details && { details: err.details }),
    ...(isDev && !dbMessage && { stack: err.stack }),
  });
}

module.exports = {
  notFoundHandler,
  globalErrorHandler,
};
