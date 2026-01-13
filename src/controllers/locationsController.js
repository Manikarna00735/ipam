const db = require('../db');

async function createLocations(req, res, next) {
  try {
    const payload = req.body || {};
    const sql = `INSERT INTO locations (name, slug, description, site, rackscount, devicescount, tagscsv, tenant, tenantgroup, parentid, docid, orgid, status, updatedat, user_id) 
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,current_timestamp,$14) RETURNING *`;
    const values = [payload.name, payload.slug, payload?.description || null, payload?.site || null, payload?.rackscount || null, payload?.devicescount || null, payload?.tagscsv || null, payload?.tenant || null, payload?.tenantgroup || null, payload?.parentid || null, payload?.docid || null, req.orgid, payload?.status || null, req.user ? req.user.user_id : null];
    const result = await db.query(sql, values);
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

async function listLocations(req, res, next) {
  try {
    const rows = (await db.query('SELECT * FROM locations WHERE orgid = $1 ORDER BY name', [req.orgid])).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function getLocation(req, res, next) {
  try {
    const rows = (await db.query('SELECT * FROM locations WHERE orgid = $1 and uuid = $2 ORDER BY name', [req.orgid, req.params.id])).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function updateLocation(req, res, next) {
  try {
    const id = req.params.id;
    const payload = req.body || {};
    const getRes = await db.query('SELECT * FROM locations WHERE uuid = $1 ', [id]);
    const row = getRes.rows[0]; if (!row) return res.status(404).json({ error: 'not found' });
    if (row.orgid !== req.orgid) return res.status(403).json({ error: 'org mismatch' });
    const setClauses = Object.keys(payload).map((k,i)=>`${k}=$${i+1}`).join(', ');
    const values = Object.values(payload);
    const sql = `UPDATE locations SET ${setClauses}, updatedat = current_timestamp, user_id = $${values.length+1} WHERE uuid = $${values.length+2} RETURNING *`;
    values.push(req.user ? req.user.user_id : null, id);
    const result = await db.query(sql, values);
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

async function deleteLocation(req, res, next) {
  try {
    const id = req.params.id;
    const getRes = await db.query('SELECT * FROM locations WHERE uuid = $1 ', [id]);
    const row = getRes.rows[0]; if (!row) return res.status(404).json({ error: 'not found' });
    if (row.orgid !== req.orgid) return res.status(403).json({ error: 'org mismatch' });
    await db.query('DELETE FROM locations WHERE uuid = $1', [id]);
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = {
  createLocations,
  listLocations,
  getLocation,
  updateLocation,
  deleteLocation,
};
