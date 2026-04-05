const db = require('../../db');
const { logActivity } = require('../../utils/activityLogger');

async function createManufacturers(req, res, next) {
  try {
    const payload = req.body || {};
    const sql = `INSERT INTO manufacturers (name, slug, description, tags, orgid, user_id, updatedat) 
    VALUES ($1,$2,$3,$4,$5,$6,current_timestamp) RETURNING *`;
    const values = [payload.name, payload.slug, payload?.description || null,  payload?.tags || null, req.orgid, req.user ? req.user.user_id : null];
    const result = await db.query(sql, values);
    const created = result.rows[0];
    
    // Log Manufacturer creation
    await logActivity({
      module: 'dcim',
      category: 'config',
      event_type: 'MANUFACTURER_CREATED',
      event_label: 'Manufacturer Created',
      target_type: 'manufacturer',
      target_id: created.uuid,
      target_display: created.name
    }, req);
    
    res.status(201).json(created);
  } catch (err) { next(err); }
}

async function listManufacturers(req, res, next) {
  try {
    const rows = (await db.query('SELECT * FROM manufacturers WHERE orgid = $1 AND deleted_at IS NULL ORDER BY name', [req.orgid])).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function getManufacturer(req, res, next) {
  try {
    const rows = (await db.query('SELECT * FROM manufacturers WHERE orgid = $1 AND uuid = $2 AND deleted_at IS NULL ORDER BY name', [req.orgid, req.params.id])).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function updateManufacturer(req, res, next) {
  try {
    const id = req.params.id;
    const payload = req.body || {};
    const getRes = await db.query('SELECT * FROM manufacturers WHERE uuid = $1 AND deleted_at IS NULL', [id]);
    const row = getRes.rows[0]; if (!row) return res.status(404).json({ error: 'not found' });
    if (row.orgid !== req.orgid) return res.status(403).json({ error: 'org mismatch' });
    const setClauses = Object.keys(payload).map((k,i)=>`${k}=$${i+1}`).join(', ');
    const values = Object.values(payload);
    const sql = `UPDATE manufacturers SET ${setClauses}, updatedat = current_timestamp, user_id = $${values.length+1} WHERE uuid = $${values.length+2} RETURNING *`;
    values.push(req.user ? req.user.user_id : null, id);
    const result = await db.query(sql, values);
    const updated = result.rows[0];
    
    // Log Manufacturer update
    await logActivity({
      module: 'dcim',
      category: 'config',
      event_type: 'MANUFACTURER_UPDATED',
      event_label: 'Manufacturer Updated',
      target_type: 'manufacturer',
      target_id: updated.uuid,
      target_display: updated.name,
      changes: {
        old: row,
        new: updated
      }
    }, req);
    
    res.json(updated);
  } catch (err) { next(err); }
}

async function deleteManufacturer(req, res, next) {
  try {
    const id = req.params.id;
    const getRes = await db.query('SELECT * FROM manufacturers WHERE uuid = $1 AND deleted_at IS NULL', [id]);
    const row = getRes.rows[0]; if (!row) return res.status(404).json({ error: 'not found' });
    if (row.orgid !== req.orgid) return res.status(403).json({ error: 'org mismatch' });
    await db.query('UPDATE manufacturers SET deleted_at = NOW() WHERE uuid = $1', [id]);
    
    // Log Manufacturer deletion
    await logActivity({
      module: 'dcim',
      category: 'config',
      event_type: 'MANUFACTURER_DELETED',
      event_label: 'Manufacturer Deleted',
      target_type: 'manufacturer',
      target_id: row.uuid,
      target_display: row.name
    }, req);
    
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = {
  createManufacturers,
  listManufacturers,
  getManufacturer,
  updateManufacturer,
  deleteManufacturer,
};
