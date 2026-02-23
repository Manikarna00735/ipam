const db = require('../../db');
const { logActivity } = require('../../utils/activityLogger');

/**
 * Create a new asset
 * Required: asset_id, category, site_uuid, status, qr_code_url
 */
async function createAsset(req, res, next) {
  try {
    const payload = req.body || {};
    const sql = `INSERT INTO assets (
      asset_id, category, manufacturer_uuid, model, serial_no, department,
      site_uuid, status, assigned_to, cost_center, purchase_order_uuid,
      purchase_date, warranty_expiry, expected_eol, purchase_cost,
      depreciation_method, depreciation_rate_pct, qr_code_url,
      qr_code_generated_at, orgid, user_id, updatedat
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, current_timestamp
    ) RETURNING *`;
    
    const values = [
      payload.asset_id,
      payload.category,
      payload.manufacturer_uuid || null,
      payload.model || null,
      payload.serial_no || null,
      payload.department || null,
      payload.site_uuid,
      payload.status || 'Active',
      payload.assigned_to || null,
      payload.cost_center || null,
      payload.purchase_order_uuid || null,
      payload.purchase_date || null,
      payload.warranty_expiry || null,
      payload.expected_eol || null,
      payload.purchase_cost || null,
      payload.depreciation_method || null,
      payload.depreciation_rate_pct || null,
      payload.qr_code_url,
      payload.qr_code_generated_at || new Date().toISOString(),
      req.orgid,
      req.user ? req.user.user_id : null
    ];
    
    const result = await db.query(sql, values);
    
    // Log Asset creation
    await logActivity({
      module: 'ams',
      category: 'config',
      event_type: 'ASSET_CREATED',
      event_label: 'Asset Created',
      target_type: 'asset',
      target_id: result.rows[0].uuid,
      target_display: result.rows[0].asset_id
    }, req);
    
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

/**
 * List all assets for the organization
 */
async function listAssets(req, res, next) {
  try {
    const sql = `
      SELECT 
        a.uuid, a.asset_id, a.category, a.model, a.serial_no, a.department,
        a.site_uuid, a.status, a.assigned_to, a.cost_center,
        a.purchase_date, a.warranty_expiry, a.expected_eol, a.purchase_cost,
        a.depreciation_method, a.depreciation_rate_pct, a.qr_code_url,
        a.qr_code_generated_at, a.createdat, a.updatedat, a.user_id,
        jsonb_build_object('name', s.name, 'uuid', s.uuid) as site,
        jsonb_build_object('name', m.name, 'uuid', m.uuid) as manufacturer,
        jsonb_build_object('po_id', po.po_id, 'uuid', po.uuid) as purchase_order
      FROM assets a
      LEFT JOIN sites s ON a.site_uuid = s.uuid
      LEFT JOIN manufacturers m ON a.manufacturer_uuid = m.uuid
      LEFT JOIN purchase_orders po ON a.purchase_order_uuid = po.uuid
      WHERE a.orgid = $1
      ORDER BY a.asset_id`;
    
    const rows = (await db.query(sql, [req.orgid])).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

/**
 * Get a single asset by UUID
 */
async function getAsset(req, res, next) {
  try {
    const sql = `
      SELECT 
        a.uuid, a.asset_id, a.category, a.model, a.serial_no, a.department,
        a.site_uuid, a.status, a.assigned_to, a.cost_center,
        a.purchase_date, a.warranty_expiry, a.expected_eol, a.purchase_cost,
        a.depreciation_method, a.depreciation_rate_pct, a.qr_code_url,
        a.qr_code_generated_at, a.createdat, a.updatedat, a.user_id,
        jsonb_build_object('name', s.name, 'uuid', s.uuid) as site,
        jsonb_build_object('name', m.name, 'uuid', m.uuid) as manufacturer,
        jsonb_build_object('po_id', po.po_id, 'uuid', po.uuid) as purchase_order
      FROM assets a
      LEFT JOIN sites s ON a.site_uuid = s.uuid
      LEFT JOIN manufacturers m ON a.manufacturer_uuid = m.uuid
      LEFT JOIN purchase_orders po ON a.purchase_order_uuid = po.uuid
      WHERE a.orgid = $1 AND a.uuid = $2`;
    
    const rows = (await db.query(sql, [req.orgid, req.params.id])).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

/**
 * Update an asset
 */
async function updateAsset(req, res, next) {
  try {
    const id = req.params.id;
    const payload = req.body || {};
    
    // Fetch existing asset
    const getRes = await db.query('SELECT * FROM assets WHERE uuid = $1', [id]);
    const row = getRes.rows[0];
    if (!row) return res.status(404).json({ error: 'Asset not found' });
    if (row.orgid !== req.orgid) return res.status(403).json({ error: 'Organization mismatch' });
    
    // Build dynamic UPDATE query
    const setClauses = Object.keys(payload).map((k, i) => `${k}=$${i + 1}`).join(', ');
    const values = Object.values(payload);
    const sql = `UPDATE assets SET ${setClauses}, updatedat = current_timestamp, user_id = $${values.length + 1} WHERE uuid = $${values.length + 2} RETURNING *`;
    values.push(req.user ? req.user.user_id : null, id);
    
    const result = await db.query(sql, values);
    
    // Log Asset update
    await logActivity({
      module: 'ams',
      category: 'config',
      event_type: 'ASSET_UPDATED',
      event_label: 'Asset Updated',
      target_type: 'asset',
      target_id: result.rows[0].uuid,
      target_display: result.rows[0].asset_id,
      changes: {
        old: row,
        new: result.rows[0]
      }
    }, req);
    
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

/**
 * Delete an asset
 */
async function deleteAsset(req, res, next) {
  try {
    const id = req.params.id;
    
    // Fetch asset to verify ownership and get details for logging
    const getRes = await db.query('SELECT * FROM assets WHERE uuid = $1', [id]);
    const row = getRes.rows[0];
    if (!row) return res.status(404).json({ error: 'Asset not found' });
    if (row.orgid !== req.orgid) return res.status(403).json({ error: 'Organization mismatch' });
    
    // Delete asset
    await db.query('DELETE FROM assets WHERE uuid = $1', [id]);
    
    // Log Asset deletion
    await logActivity({
      module: 'ams',
      category: 'config',
      event_type: 'ASSET_DELETED',
      event_label: 'Asset Deleted',
      target_type: 'asset',
      target_id: row.uuid,
      target_display: row.asset_id
    }, req);
    
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = {
  createAsset,
  listAssets,
  getAsset,
  updateAsset,
  deleteAsset
};
