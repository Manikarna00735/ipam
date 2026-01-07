const jwt = require('jsonwebtoken');
const db = require('../db');

async function requireAuth(req, res, next) {
  try {
    const h = req.headers.authorization;
    if (!h || !h.startsWith('Bearer ')) return res.status(401).json({ error: 'missing token' });
    const token = h.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const result = await db.query('SELECT id, email, created_at FROM users WHERE id = $1', [payload.sub]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'invalid token' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid token' });
  }
}

module.exports = { requireAuth };
