const db = require('../db');
const { logActivity } = require('../utils/activityLogger');

async function createProviders(req, res, next) {
  try {
    const payload = req.body || {};
    const sql = `INSERT INTO providers (name, slug, description, comments, asnscsv, 
    tagscsv, orgid, user_id, updatedat) 
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,current_timestamp) RETURNING *`;
    const values = [payload.name, payload.slug, payload?.description || '', payload?.comments || '', payload?.asnscsv || '', payload?.tagscsv || '', req.orgid, req.user.user_id];
    const result = await db.query(sql, values);
    
    // Log Provider creation
    await logActivity({
      module: 'ipam',
      category: 'config',
      event_type: 'PROVIDER_CREATED',
      event_label: 'Provider Created',
      target_type: 'provider',
      target_id: result.rows[0].uuid,
      target_display: result.rows[0].name
    }, req);
    
    const created = result.rows[0];
    res.status(201).json(created);
  } catch (err) { next(err); }
}

async function listProviders(req, res, next) {
  try {
    const rows = (await db.query('SELECT * FROM providers WHERE orgid = $1 ORDER BY name', [req.orgid])).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function getProvider(req, res, next) {
  try {
    const rows = (await db.query('SELECT * FROM providers WHERE orgid = $1 and uuid = $2 ORDER BY name', [req.orgid, req.params.id])).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function updateProvider(req, res, next) {
  try {
    const id = req.params.id;
    const payload = req.body || {};
    const getRes = await db.query('SELECT * FROM providers WHERE uuid = $1 ', [id]);
    const row = getRes.rows[0]; if (!row) return res.status(404).json({ error: 'not found' });
    if (row.orgid !== req.orgid) return res.status(403).json({ error: 'org mismatch' });
    const setClauses = Object.keys(payload).map((k,i)=>`${k}=$${i+1}`).join(', ');
    const values = Object.values(payload);
    const sql = `UPDATE providers SET ${setClauses}, updatedat = current_timestamp, user_id = $${values.length+1} WHERE uuid = $${values.length+2} RETURNING *`;
    values.push(req.user.user_id, id);
    const result = await db.query(sql, values);
    
    // Log Provider update
    await logActivity({
      module: 'ipam',
      category: 'config',
      event_type: 'PROVIDER_UPDATED',
      event_label: 'Provider Updated',
      target_type: 'provider',
      target_id: result.rows[0].uuid,
      target_display: result.rows[0].name,
      changes: {
        old: row,
        new: result.rows[0]
      }
    }, req);
    
    const updated = result.rows[0];
    res.json(updated);
  } catch (err) { next(err); }
}

async function deleteProvider(req, res, next) {
  try {
    const id = req.params.id;
    const getRes = await db.query('SELECT * FROM providers WHERE uuid = $1 ', [id]);
    const row = getRes.rows[0]; if (!row) return res.status(404).json({ error: 'not found' });
    if (row.orgid !== req.orgid) return res.status(403).json({ error: 'org mismatch' });
    await db.query('DELETE FROM providers WHERE uuid = $1', [id]);
    
    // Log Provider deletion
    await logActivity({
      module: 'ipam',
      category: 'config',
      event_type: 'PROVIDER_DELETED',
      event_label: 'Provider Deleted',
      target_type: 'provider',
      target_id: row.uuid,
      target_display: row.name
    }, req);
    
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = {
  createProviders,
  listProviders,
  getProvider,
  updateProvider,
  deleteProvider,
};