const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function query(text, params) {
  try {
    // You MUST await here so the catch block stays 'active' 
    // until the DB responds
    const res = await pool.query(text, params);
    return res;
  } catch (err) {
    console.error('Database query error:', err.message);
    throw err; // Now this will correctly trigger
  }
}
module.exports = {
  query,
  pool,
};
