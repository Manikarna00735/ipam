const { Pool } = require('pg');
const logger = require('./utils/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,                       // cap connections (Render starter has a low limit)
  idleTimeoutMillis: 30000,      // release idle connections after 30s
  connectionTimeoutMillis: 5000, // fail fast if no connection available in 5s
});

// statement_timeout must be set as a session parameter — not a Pool constructor option
pool.on('connect', (client) => {
  client.query('SET statement_timeout = 30000');
});

pool.on('error', (err) => {
  logger.error({ err: err.message }, 'Unexpected PostgreSQL pool error');
});

async function query(text, params) {
  try {
    // You MUST await here so the catch block stays 'active'
    // until the DB responds
    const res = await pool.query(text, params);
    return res;
  } catch (err) {
    logger.error({ err: err.message }, 'Database query error');
    throw err; // Now this will correctly trigger
  }
}
module.exports = {
  query,
  pool,
};
