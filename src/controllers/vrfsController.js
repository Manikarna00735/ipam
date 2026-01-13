const db = require('../db');

async function createVrfs(req, res, next) {
  try {
    const payload = req.body || {};
    const sql = `INSERT INTO vrfs (name, description, vfsid, tag, tenant, tenantgroup, importtarget, exporttarget, docid, orgid, comments, updatedat, user_id) 
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,current_timestamp,$12) RETURNING *`;
    const values = [payload.name, payload?.description || null, payload?.vfsid || payload?.slug || null, payload?.tag || payload?.tagscsv || null, payload?.tenant || null, payload?.tenantgroup || null, payload?.importtarget || null, payload?.exporttarget || null, payload?.docid || null, req.orgid, payload?.comments || null, req.user ? req.user.user_id : null];
    const result = await db.query(sql, values);
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

async function listVrfs(req, res, next) {
  try {
    const rows = (await db.query('SELECT * FROM vrfs WHERE orgid = $1 ORDER BY name', [req.orgid])).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function getVrf(req, res, next) {
  try {
    const rows = (await db.query('SELECT * FROM vrfs WHERE orgid = $1 and uuid = $2 ORDER BY name', [req.orgid, req.params.id])).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function updateVrf(req, res, next) {
  try {
    const id = req.params.id;
    const payload = req.body || {};
    const getRes = await db.query('SELECT * FROM vrfs WHERE uuid = $1 ', [id]);
    const row = getRes.rows[0]; if (!row) return res.status(404).json({ error: 'not found' });
    if (row.orgid !== req.orgid) return res.status(403).json({ error: 'org mismatch' });
    const setClauses = Object.keys(payload).map((k,i)=>`${k}=$${i+1}`).join(', ');
    const values = Object.values(payload);
    const sql = `UPDATE vrfs SET ${setClauses}, updatedat = current_timestamp, user_id = $${values.length+1} WHERE uuid = $${values.length+2} RETURNING *`;
    values.push(req.user ? req.user.user_id : null, id);
    const result = await db.query(sql, values);
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

async function deleteVrf(req, res, next) {
  try {
    const id = req.params.id;
    const getRes = await db.query('SELECT * FROM vrfs WHERE uuid = $1 ', [id]);
    const row = getRes.rows[0]; if (!row) return res.status(404).json({ error: 'not found' });
    if (row.orgid !== req.orgid) return res.status(403).json({ error: 'org mismatch' });
    await db.query('DELETE FROM vrfs WHERE uuid = $1', [id]);
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = {
  createVrfs,
  listVrfs,
  getVrf,
  updateVrf,
  deleteVrf,
};
