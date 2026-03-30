const logger = require('../utils/logger');

const isProd = process.env.NODE_ENV === 'production';

/**
 * Centralized Express error handler — must be registered last in the middleware chain.
 * Logs full error context and returns a safe response (no stack traces in production).
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;

  const log = req.log || logger;
  log.error({
    err: {
      message: err.message,
      name: err.name,
      ...(isProd ? {} : { stack: err.stack }),
    },
    method: req.method,
    url: req.originalUrl,
    orgId: req.orgid,
    userId: req.user?.user_id,
    reqId: req.id,
  }, 'Request error');

  // Never leak stack traces or internal details to the client in production
  res.status(status).json({
    error: status < 500 ? err.message : 'Internal server error',
    ...(isProd ? {} : { stack: err.stack }),
    reqId: req.id,
  });
}

module.exports = errorHandler;
