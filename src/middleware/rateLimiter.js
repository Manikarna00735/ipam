const rateLimit = require('express-rate-limit');

// General API: 100 requests per minute per org (or IP if no org header)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
  keyGenerator: (req) => req.headers['x-org-id'] || req.ip,
});

// Write endpoints (POST/PUT/DELETE): 30 requests per minute per org
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many write requests. Please try again later.' },
  keyGenerator: (req) => req.headers['x-org-id'] || req.ip,
});

// Activity log writes: 200 per minute (fire-and-forget from app)
const logLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many log requests. Please try again later.' },
  keyGenerator: (req) => req.headers['x-org-id'] || req.ip,
});

module.exports = { apiLimiter, writeLimiter, logLimiter };
