const admin = require('firebase-admin');
const { ensureInitialized } = require('../utils/firebaseAdmin');

async function requireAuth(req, res, next) {
  ensureInitialized();
  try {
    const h = req.headers.authorization;
    if (!h || !h.startsWith('Bearer ')) return res.status(401).json({ error: 'missing token' });
    const token = h.slice(7);
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = { user_id: decoded.uid };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid token' });
  }
}

module.exports = { requireAuth };
