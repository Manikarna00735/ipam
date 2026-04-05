const db = require('../../db');
const { logActivity } = require('../../utils/activityLogger');

async function createVlans(req, res, next) {
  try {
    const payload = req.body || {};
    const sql = `INSERT INTO vlans (name, role, status, description, tag, tenant, 
    orgid, comments, updatedat, user_id) 
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,current_timestamp,$9) RETURNING *`;
    const values = [payload.name, payload?.role || null, payload?.status || null, 
      payload?.description || null, 
      payload?.tag || payload?.tagscsv || null, payload?.tenant || null,
      req.orgid, payload?.comments || null, req.user ? req.user.user_id : null];
    const result = await db.query(sql, values);
    
    // Log VLAN creation
    await logActivity({
      module: 'ipam',
      category: 'config',
      event_type: 'VLAN_CREATED',
      event_label: 'VLAN Created',
      target_type: 'vlan',
      target_id: result.rows[0].uuid,
      target_display: result.rows[0].name
    }, req);
    
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

async function listVlans(req, res, next) {
  try {
    const rows = (await db.query('SELECT * FROM vlans WHERE orgid = $1 AND deleted_at IS NULL ORDER BY name', [req.orgid])).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function getVlan(req, res, next) {
  try {
    const rows = (await db.query('SELECT * FROM vlans WHERE orgid = $1 AND uuid = $2 AND deleted_at IS NULL ORDER BY name', [req.orgid, req.params.id])).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function updateVlan(req, res, next) {
  try {
    const id = req.params.id;
    const payload = req.body || {};
    const getRes = await db.query('SELECT * FROM vlans WHERE uuid = $1 AND deleted_at IS NULL', [id]);
    const row = getRes.rows[0]; if (!row) return res.status(404).json({ error: 'not found' });
    if (row.orgid !== req.orgid) return res.status(403).json({ error: 'org mismatch' });
    const setClauses = Object.keys(payload).map((k,i)=>`${k}=$${i+1}`).join(', ');
    const values = Object.values(payload);
    const sql = `UPDATE vlans SET ${setClauses}, updatedat = current_timestamp, user_id = $${values.length+1} WHERE uuid = $${values.length+2} RETURNING *`;
    values.push(req.user ? req.user.user_id : null, id);
    const result = await db.query(sql, values);
    
    // Log VLAN update
    await logActivity({
      module: 'ipam',
      category: 'config',
      event_type: 'VLAN_UPDATED',
      event_label: 'VLAN Updated',
      target_type: 'vlan',
      target_id: result.rows[0].uuid,
      target_display: result.rows[0].name,
      changes: {
        old: row,
        new: result.rows[0]
      }
    }, req);
    
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

async function deleteVlan(req, res, next) {
  try {
    const id = req.params.id;
    const getRes = await db.query('SELECT * FROM vlans WHERE uuid = $1 AND deleted_at IS NULL', [id]);
    const row = getRes.rows[0]; if (!row) return res.status(404).json({ error: 'not found' });
    if (row.orgid !== req.orgid) return res.status(403).json({ error: 'org mismatch' });
    await db.query('UPDATE vlans SET deleted_at = NOW() WHERE uuid = $1', [id]);
    
    // Log VLAN deletion
    await logActivity({
      module: 'ipam',
      category: 'config',
      event_type: 'VLAN_DELETED',
      event_label: 'VLAN Deleted',
      target_type: 'vlan',
      target_id: row.uuid,
      target_display: row.name
    }, req);
    
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = {
  createVlans,
  listVlans,
  getVlan,
  updateVlan,
  deleteVlan,
};
