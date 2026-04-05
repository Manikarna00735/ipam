const db = require('../../db');
const { logActivity } = require('../../utils/activityLogger');

// mandatory fields: name, vendor_type, category, internal_owner, email
async function createVendor(req, res, next) {
  try {
    const payload = req.body || {};
    const sql = `INSERT INTO vendors (name, vendor_type, category, status, internal_owner,
      primary_contact_name, email, phone, website, vendor_criticality, notes, attachments,
      orgid, user_id, updatedat)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,current_timestamp) RETURNING *`;
    const values = [
      payload.name,
      payload.vendor_type,
      payload.category,
      payload.status || 'Active',
      payload.internal_owner,
      payload.primary_contact_name || null,
      payload.email,
      payload.phone || null,
      payload.website || null,
      payload.vendor_criticality || 'Medium',
      payload.notes || null,
      payload.attachments || [],
      req.orgid,
      req.user ? req.user.user_id : null,
    ];
    const result = await db.query(sql, values);
    
    // Log Vendor creation
    await logActivity({
      module: 'ams',
      category: 'config',
      event_type: 'VENDOR_CREATED',
      event_label: 'Vendor Created',
      target_type: 'vendor',
      target_id: result.rows[0].uuid,
      target_display: result.rows[0].name
    }, req);
    
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

async function listVendors(req, res, next) {
  try {
    const rows = (await db.query(
      `SELECT * FROM vendors WHERE orgid = $1 AND deleted_at IS NULL ORDER BY name`,
      [req.orgid]
    )).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function getVendor(req, res, next) {
  try {
    const rows = (await db.query(
      `SELECT * FROM vendors WHERE orgid = $1 AND uuid = $2 AND deleted_at IS NULL`,
      [req.orgid, req.params.id]
    )).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function updateVendor(req, res, next) {
  try {
    const id = req.params.id;
    const payload = req.body || {};
    const getRes = await db.query('SELECT * FROM vendors WHERE uuid = $1 AND deleted_at IS NULL', [id]);
    const row = getRes.rows[0]; if (!row) return res.status(404).json({ error: 'not found' });
    if (row.orgid !== req.orgid) return res.status(403).json({ error: 'org mismatch' });
    const setClauses = Object.keys(payload).map((k, i) => `${k}=$${i + 1}`).join(', ');
    const values = Object.values(payload);
    const sql = `UPDATE vendors SET ${setClauses}, updatedat = current_timestamp, user_id = $${values.length + 1} WHERE uuid = $${values.length + 2} RETURNING *`;
    values.push(req.user ? req.user.user_id : null, id);
    const result = await db.query(sql, values);
    
    // Log Vendor update
    await logActivity({
      module: 'ams',
      category: 'config',
      event_type: 'VENDOR_UPDATED',
      event_label: 'Vendor Updated',
      target_type: 'vendor',
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

async function deleteVendor(req, res, next) {
  try {
    const id = req.params.id;
    const getRes = await db.query('SELECT * FROM vendors WHERE uuid = $1 AND deleted_at IS NULL', [id]);
    const row = getRes.rows[0]; if (!row) return res.status(404).json({ error: 'not found' });
    if (row.orgid !== req.orgid) return res.status(403).json({ error: 'org mismatch' });
    await db.query('UPDATE vendors SET deleted_at = NOW() WHERE uuid = $1', [id]);
    
    // Log Vendor deletion
    await logActivity({
      module: 'ams',
      category: 'config',
      event_type: 'VENDOR_DELETED',
      event_label: 'Vendor Deleted',
      target_type: 'vendor',
      target_id: row.uuid,
      target_display: row.name
    }, req);
    
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { createVendor, listVendors, getVendor, updateVendor, deleteVendor };
