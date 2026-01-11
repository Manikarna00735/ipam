const db = require('../db');

async function createVrfs(req, res, next) {
  try {
    const payload = req.body || {};
    const sql = `INSERT INTO vrfs (name, slug, description, comments, tagscsv, org_uuid, user_uuid, updatedat) 
    VALUES ($1,$2,$3,$4,$5,$6,$7,current_timestamp) RETURNING *`;
    const values = [payload.name, payload.slug, payload?.description || '', payload?.comments || '', payload?.tagscsv || '', req.org_uuid, req.user.uuid];
    const result = await db.query(sql, values);
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

async function listVrfs(req, res, next) {
  try {
    const rows = (await db.query('SELECT * FROM vrfs WHERE org_uuid = $1 ORDER BY name', [req.org_uuid])).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function getVrf(req, res, next) {
  try {
    const rows = (await db.query('SELECT * FROM vrfs WHERE org_uuid = $1 and uuid = $2 ORDER BY name', [req.org_uuid, req.params.id])).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function updateVrf(req, res, next) {
  try {
    const id = req.params.id;
    const payload = req.body || {};
    const getRes = await db.query('SELECT * FROM vrfs WHERE uuid = $1 ', [id]);
    const row = getRes.rows[0]; if (!row) return res.status(404).json({ error: 'not found' });
    if (row.org_uuid !== req.org_uuid) return res.status(403).json({ error: 'org mismatch' });
    const setClauses = Object.keys(payload).map((k,i)=>`${k}=$${i+1}`).join(', ');
    const values = Object.values(payload);
    const sql = `UPDATE vrfs SET ${setClauses}, updatedat = current_timestamp, user_uuid = $${values.length+1} WHERE uuid = $${values.length+2} RETURNING *`;
    values.push(req.user.uuid, id);
    const result = await db.query(sql, values);
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

async function deleteVrf(req, res, next) {
  try {
    const id = req.params.id;
    const getRes = await db.query('SELECT * FROM vrfs WHERE uuid = $1 ', [id]);
    const row = getRes.rows[0]; if (!row) return res.status(404).json({ error: 'not found' });
    if (row.org_uuid !== req.org_uuid) return res.status(403).json({ error: 'org mismatch' });
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
