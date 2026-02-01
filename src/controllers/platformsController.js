const db = require('../db');

async function createPlatforms(req, res, next) {
  try {
    const payload = req.body || {};
    const sql = `INSERT INTO platforms (name, slug, description, tags, manufacturer_uuid, orgid, user_id, updatedat) 
    VALUES ($1,$2,$3,$4,$5,$6,$7,current_timestamp) RETURNING *`;
    const values = [payload.name, payload.slug, payload?.description || null, payload?.tags || null, payload?.manufacturer || null, 
    req.orgid, req.user ? req.user.user_id : null];
    const result = await db.query(sql, values);
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

async function listPlatforms(req, res, next) {
  try {
    const rows = (await db.query(`SELECT p.uuid, p.name, p.slug, p.description, p.tags, 
      p.orgid,p.createdat, p.updatedat, p.user_id, 
      jsonb_build_object('uuid', m.uuid, 'name', m.name) as manufacturer
      FROM platforms p
      left join manufacturers m on p.manufacturer_uuid = m.uuid
      WHERE p.orgid = $1 ORDER BY p.name`, [req.orgid])).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function getPlatform(req, res, next) {
  try {
    const rows = (await db.query(`SELECT p.uuid, p.name, p.slug, p.description, p.tags, 
      p.orgid,p.createdat, p.updatedat, p.user_id, 
      jsonb_build_object('uuid', m.uuid, 'name', m.name) as manufacturer
      FROM platforms p
      left join manufacturers m on p.manufacturer_uuid = m.uuid
      WHERE p.orgid = $1 and p.uuid = $2 ORDER BY p.name`, [req.orgid, req.params.id])).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function updatePlatform(req, res, next) {
  try {
    const id = req.params.id;
    const payload = req.body || {};
    const getRes = await db.query('SELECT * FROM platforms WHERE uuid = $1 ', [id]);
    const row = getRes.rows[0]; if (!row) return res.status(404).json({ error: 'not found' });
    if (row.orgid !== req.orgid) return res.status(403).json({ error: 'org mismatch' });
    const setClauses = Object.keys(payload).map((k,i)=>`${k}=$${i+1}`).join(', ');
    const values = Object.values(payload);
    const sql = `UPDATE platforms SET ${setClauses}, updatedat = current_timestamp, user_id = $${values.length+1} WHERE uuid = $${values.length+2} RETURNING *`;
    values.push(req.user ? req.user.user_id : null, id);
    const result = await db.query(sql, values);
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

async function deletePlatform(req, res, next) {
  try {
    const id = req.params.id;
    const getRes = await db.query('SELECT * FROM platforms WHERE uuid = $1 ', [id]);
    const row = getRes.rows[0]; if (!row) return res.status(404).json({ error: 'not found' });
    if (row.orgid !== req.orgid) return res.status(403).json({ error: 'org mismatch' });
    await db.query('DELETE FROM platforms WHERE uuid = $1', [id]);
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = {
  createPlatforms,
  listPlatforms,
  getPlatform,
  updatePlatform,
  deletePlatform,
};
