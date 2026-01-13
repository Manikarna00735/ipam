const db = require('../db');

async function createCircuits(req, res, next) {
  try {
    const payload = req.body || {};
    const sql = `INSERT INTO circuits (circuitid, provider, sidea, type, status, comments, orgid, user_id, updatedat) 
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,current_timestamp) RETURNING *`;
    const values = [payload.circuitid || payload.name || null, payload.provider || null, payload.sidea || null, payload.type || null, payload.status || null, payload?.comments || null, req.orgid, req.user ? req.user.user_id : null];
    const result = await db.query(sql, values);
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

async function listCircuits(req, res, next) {
  try {
    const rows = (await db.query('SELECT * FROM circuits WHERE orgid = $1 ORDER BY circuitid', [req.orgid])).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function getCircuit(req, res, next) {
  try {
    const rows = (await db.query('SELECT * FROM circuits WHERE orgid = $1 and uuid = $2 ORDER BY circuitid', [req.orgid, req.params.id])).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function updateCircuit(req, res, next) {
  try {
    const id = req.params.id;
    const payload = req.body || {};
    const getRes = await db.query('SELECT * FROM circuits WHERE uuid = $1 ', [id]);
    const row = getRes.rows[0]; if (!row) return res.status(404).json({ error: 'not found' });
    if (row.orgid !== req.orgid) return res.status(403).json({ error: 'org mismatch' });
    const setClauses = Object.keys(payload).map((k,i)=>`${k}=$${i+1}`).join(', ');
    const values = Object.values(payload);
    const sql = `UPDATE circuits SET ${setClauses}, updatedat = current_timestamp, user_id = $${values.length+1} WHERE uuid = $${values.length+2} RETURNING *`;
    values.push(req.user ? req.user.user_id : null, id);
    const result = await db.query(sql, values);
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

async function deleteCircuit(req, res, next) {
  try {
    const id = req.params.id;
    const getRes = await db.query('SELECT * FROM circuits WHERE uuid = $1 ', [id]);
    const row = getRes.rows[0]; if (!row) return res.status(404).json({ error: 'not found' });
    if (row.orgid !== req.orgid) return res.status(403).json({ error: 'org mismatch' });
    await db.query('DELETE FROM circuits WHERE uuid = $1', [id]);
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = {
  createCircuits,
  listCircuits,
  getCircuit,
  updateCircuit,
  deleteCircuit,
};
