const db = require('../../db');
const { logActivity, getTargetDisplay } = require('../../utils/activityLogger');

// mandatory fields: po_id, vendor_uuid, site_uuid, quantity, unit_cost
// Note: total_value is a GENERATED column (quantity * unit_cost) — never insert/update it directly
async function createPurchaseOrder(req, res, next) {
  try {
    const payload = req.body || {};
    const sql = `INSERT INTO purchase_orders (po_id, vendor_uuid, department, site_uuid,
      owner_requester_id, status, category, manufacturer_uuid, model, quantity, unit_cost,
      purchase_date, warranty_expiry, quantity_received, orgid, user_id, updatedat)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,current_timestamp) RETURNING *`;
    const values = [
      payload.po_id,
      payload.vendor_uuid,
      payload.department || null,
      payload.site_uuid,
      payload.owner_requester_id || null,
      payload.status || 'DRAFT',
      payload.category || null,
      payload.manufacturer_uuid || null,
      payload.model || null,
      payload.quantity,
      payload.unit_cost,
      payload.purchase_date || null,
      payload.warranty_expiry || null,
      payload.quantity_received || 0,
      req.orgid,
      req.user ? req.user.user_id : null,
    ];
    const result = await db.query(sql, values);
    
    // Log Purchase Order creation
    await logActivity({
      module: 'ams',
      category: 'config',
      event_type: 'PO_CREATED',
      event_label: 'Purchase Order Created',
      target_type: 'purchase_order',
      target_id: result.rows[0].uuid,
      target_display: result.rows[0].po_id
    }, req);
    
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

async function listPurchaseOrders(req, res, next) {
  try {
    const rows = (await db.query(
      `SELECT po.uuid, po.po_id, po.department, po.owner_requester_id, po.status,
        po.category, po.model, po.quantity, po.unit_cost, po.total_value,
        po.purchase_date, po.warranty_expiry, po.quantity_received,
        po.orgid, po.createdat, po.updatedat, po.user_id,
        jsonb_build_object('name', v.name, 'uuid', v.uuid) as vendor_uuid,
        jsonb_build_object('name', s.name, 'uuid', s.uuid) as site_uuid,
        jsonb_build_object('name', m.name, 'uuid', m.uuid) as manufacturer_uuid
        FROM purchase_orders po
        LEFT JOIN vendors v ON po.vendor_uuid = v.uuid
        LEFT JOIN sites s ON po.site_uuid = s.uuid
        LEFT JOIN manufacturers m ON po.manufacturer_uuid = m.uuid
        WHERE po.orgid = $1 ORDER BY po.po_id`,
      [req.orgid]
    )).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function getPurchaseOrder(req, res, next) {
  try {
    const rows = (await db.query(
      `SELECT po.uuid, po.po_id, po.department, po.owner_requester_id, po.status,
        po.category, po.model, po.quantity, po.unit_cost, po.total_value,
        po.purchase_date, po.warranty_expiry, po.quantity_received,
        po.orgid, po.createdat, po.updatedat, po.user_id,
        jsonb_build_object('name', v.name, 'uuid', v.uuid) as vendor_uuid,
        jsonb_build_object('name', s.name, 'uuid', s.uuid) as site_uuid,
        jsonb_build_object('name', m.name, 'uuid', m.uuid) as manufacturer_uuid
        FROM purchase_orders po
        LEFT JOIN vendors v ON po.vendor_uuid = v.uuid
        LEFT JOIN sites s ON po.site_uuid = s.uuid
        LEFT JOIN manufacturers m ON po.manufacturer_uuid = m.uuid
        WHERE po.orgid = $1 AND po.uuid = $2`,
      [req.orgid, req.params.id]
    )).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function updatePurchaseOrder(req, res, next) {
  try {
    const id = req.params.id;
    const payload = req.body || {};
    const getRes = await db.query('SELECT * FROM purchase_orders WHERE uuid = $1', [id]);
    const row = getRes.rows[0]; if (!row) return res.status(404).json({ error: 'not found' });
    if (row.orgid !== req.orgid) return res.status(403).json({ error: 'org mismatch' });
    // total_value is a GENERATED ALWAYS column — must not be included in SET clause
    delete payload.total_value;
    const setClauses = Object.keys(payload).map((k, i) => `${k}=$${i + 1}`).join(', ');
    const values = Object.values(payload);
    const sql = `UPDATE purchase_orders SET ${setClauses}, updatedat = current_timestamp, user_id = $${values.length + 1} WHERE uuid = $${values.length + 2} RETURNING *`;
    values.push(req.user ? req.user.user_id : null, id);
    const result = await db.query(sql, values);
    
    // Auto-create assets if status changed to RECEIVED or PARTIALLY_RECEIVED
    const newStatus = payload.status || row.status;
    if ((newStatus === 'RECEIVED' || newStatus === 'PARTIALLY_RECEIVED') && 
        (row.status !== newStatus)) {
      const assetsToCreate = newStatus === 'RECEIVED' ? row.quantity : (payload.quantity_received || row.quantity_received);
      
      if (assetsToCreate > 0) {
        // Generate base asset_id from PO id
        const baseAssetId = row.po_id.replace(/-/g, '_');
        
        // Build all asset values for bulk insert
        let assetValues = [];
        let placeholderIndex = 1;
        let valueSets = [];
        
        for (let i = 0; i < assetsToCreate; i++) {
          const assetId = `${baseAssetId}_${i + 1}`;
          const qrCodeUrl = `${process.env.QR_CODE_BASE_URL || 'https://qr.company.com'}/${assetId}`;
          
          valueSets.push(
            `($${placeholderIndex++}, $${placeholderIndex++}, $${placeholderIndex++}, $${placeholderIndex++}, ` +
            `$${placeholderIndex++}, $${placeholderIndex++}, $${placeholderIndex++}, $${placeholderIndex++}, ` +
            `$${placeholderIndex++}, $${placeholderIndex++}, $${placeholderIndex++}, $${placeholderIndex++}, ` +
            `current_timestamp, $${placeholderIndex++}, $${placeholderIndex++}, current_timestamp)`
          );
          
          assetValues.push(
            assetId,
            row.category || null,
            row.manufacturer_uuid || null,
            row.model || null,
            row.department || null,
            row.site_uuid,
            'Active',
            row.uuid,
            row.purchase_date || null,
            row.warranty_expiry || null,
            row.unit_cost || null,
            qrCodeUrl,
            req.orgid,
            req.user ? req.user.user_id : null
          );
        }
        
        // Single bulk insert statement
        const bulkInsertSql = `INSERT INTO assets (
          asset_id, category, manufacturer_uuid, model, department, site_uuid, status,
          purchase_order_uuid, purchase_date, warranty_expiry, purchase_cost,
          qr_code_url, qr_code_generated_at, orgid, user_id, updatedat
        ) VALUES ${valueSets.join(', ')}`;
        
        await db.query(bulkInsertSql, assetValues);
        
        // Log asset auto-creation
        await logActivity({
          module: 'ams',
          category: 'automation',
          event_type: 'ASSETS_AUTO_CREATED',
          event_label: `${assetsToCreate} Asset(s) Auto-Created from PO`,
          target_type: 'purchase_order',
          target_id: result.rows[0].uuid,
          target_display: result.rows[0].po_id,
          metadata: {
            assets_created: assetsToCreate,
            from_status: newStatus
          }
        }, req);
      }
    }
    
    // Log Purchase Order update
    await logActivity({
      module: 'ams',
      category: 'config',
      event_type: 'PO_UPDATED',
      event_label: 'Purchase Order Updated',
      target_type: 'purchase_order',
      target_id: result.rows[0].uuid,
      target_display: getTargetDisplay(result.rows[0], 'purchase_order'),
      changes: {
        old: row,
        new: result.rows[0]
      }
    }, req);
    
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

async function deletePurchaseOrder(req, res, next) {
  try {
    const id = req.params.id;
    const getRes = await db.query('SELECT * FROM purchase_orders WHERE uuid = $1', [id]);
    const row = getRes.rows[0]; if (!row) return res.status(404).json({ error: 'not found' });
    if (row.orgid !== req.orgid) return res.status(403).json({ error: 'org mismatch' });
    await db.query('DELETE FROM purchase_orders WHERE uuid = $1', [id]);
    
    // Log Purchase Order deletion
    await logActivity({
      module: 'ams',
      category: 'config',
      event_type: 'PO_DELETED',
      event_label: 'Purchase Order Deleted',
      target_type: 'purchase_order',
      target_id: row.uuid,
      target_display: getTargetDisplay(row, 'purchase_order')
    }, req);
    
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { createPurchaseOrder, listPurchaseOrders, getPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder };
