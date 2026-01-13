const db = require('../db');

async function createWireless(req, res, next) {
  try {
    const payload = req.body || {};
    const sql = `INSERT INTO wireless (ssid, description, tag, tenant, tenantgroup, vlan, "group", presharekey, authtype, authcipher, docid, interfaces, orgid, comments, status, createdat, updatedat, user_id) 
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,current_timestamp,current_timestamp,$16) RETURNING *`;
    const values = [payload.ssid, payload.description || null, payload.tag || null, payload.tenant || null, payload.tenantgroup || null, payload.vlan || null, payload.group || null, payload.presharekey || null, payload.authtype || null, payload.authcipher || null, payload.docid || null, payload.interfaces || null, req.orgid, payload.comments || null, payload.status || null, req.user ? req.user.user_id : null];
    const result = await db.query(sql, values);
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

async function listWireless(req, res, next) {
  try {
    const rows = (await db.query('SELECT * FROM wireless WHERE orgid = $1 ORDER BY ssid', [req.orgid])).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function getWireless(req, res, next) {
  try {
    const rows = (await db.query('SELECT * FROM wireless WHERE orgid = $1 and uuid = $2 ORDER BY ssid', [req.orgid, req.params.id])).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function updateWireless(req, res, next) {
  try {
    const id = req.params.id;
    const payload = req.body || {};
    const getRes = await db.query('SELECT * FROM wireless WHERE uuid = $1 ', [id]);
    const row = getRes.rows[0]; if (!row) return res.status(404).json({ error: 'not found' });
    if (row.orgid !== req.orgid) return res.status(403).json({ error: 'org mismatch' });
    const setClauses = Object.keys(payload).map((k,i)=>`${k}=$${i+1}`).join(', ');
    const values = Object.values(payload);
    const sql = `UPDATE wireless SET ${setClauses}, updatedat = current_timestamp, user_id = $${values.length+1} WHERE uuid = $${values.length+2} RETURNING *`;
    values.push(req.user ? req.user.user_id : null, id);
    const result = await db.query(sql, values);
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

async function deleteWireless(req, res, next) {
  try {
    const id = req.params.id;
    const getRes = await db.query('SELECT * FROM wireless WHERE uuid = $1 ', [id]);
    const row = getRes.rows[0]; if (!row) return res.status(404).json({ error: 'not found' });
    if (row.orgid !== req.orgid) return res.status(403).json({ error: 'org mismatch' });
    await db.query('DELETE FROM wireless WHERE uuid = $1', [id]);
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = {
  createWireless,
  listWireless,
  getWireless,
  updateWireless,
  deleteWireless,
};
