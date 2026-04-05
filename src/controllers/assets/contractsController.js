const db = require('../../db');
const { logActivity, getTargetDisplay } = require('../../utils/activityLogger');

// mandatory fields: contract_name, contract_type, vendor_uuid
async function createContract(req, res, next) {
  try {
    const payload = req.body || {};
    const sql = `INSERT INTO contracts (contract_name, vendor_uuid, contract_type, status,
      start_date, end_date, value, currency, payment_terms, renewal_type, notice_period,
      renewal_reminder, internal_owner, linked_assets, linked_licenses, linked_pos,
      documents, notes, orgid, user_id, updatedat)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,current_timestamp) RETURNING *`;
    const values = [
      payload.contract_name,
      payload.vendor_uuid,
      payload.contract_type,
      payload.status || 'Active',
      payload.start_date || null,
      payload.end_date || null,
      payload.value || 0.00,
      payload.currency || 'USD',
      payload.payment_terms || null,
      payload.renewal_type || null,
      payload.notice_period || 0,
      payload.renewal_reminder || 30,
      payload.internal_owner || null,
      payload.linked_assets || [],
      payload.linked_licenses || [],
      payload.linked_pos || [],
      payload.documents || [],
      payload.notes || null,
      req.orgid,
      req.user ? req.user.user_id : null,
    ];
    const result = await db.query(sql, values);
    
    // Log Contract creation
    await logActivity({
      module: 'ams',
      category: 'config',
      event_type: 'CONTRACT_CREATED',
      event_label: 'Contract Created',
      target_type: 'contract',
      target_id: result.rows[0].uuid,
      target_display: getTargetDisplay(result.rows[0], 'contract')
    }, req);
    
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

async function listContracts(req, res, next) {
  try {
    const rows = (await db.query(
      `SELECT c.uuid, c.contract_name, c.contract_type, c.status, c.start_date, c.end_date,
        c.value, c.currency, c.payment_terms, c.renewal_type, c.notice_period,
        c.renewal_reminder, c.internal_owner, c.linked_assets, c.linked_licenses,
        c.linked_pos, c.documents, c.notes, c.orgid, c.createdat, c.updatedat, c.user_id,
        jsonb_build_object('name', v.name, 'uuid', v.uuid) as vendor_uuid
        FROM contracts c
        LEFT JOIN vendors v ON c.vendor_uuid = v.uuid
        WHERE c.orgid = $1 AND c.deleted_at IS NULL ORDER BY c.contract_name`,
      [req.orgid]
    )).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function getContract(req, res, next) {
  try {
    const rows = (await db.query(
      `SELECT c.uuid, c.contract_name, c.contract_type, c.status, c.start_date, c.end_date,
        c.value, c.currency, c.payment_terms, c.renewal_type, c.notice_period,
        c.renewal_reminder, c.internal_owner, c.linked_assets, c.linked_licenses,
        c.linked_pos, c.documents, c.notes, c.orgid, c.createdat, c.updatedat, c.user_id,
        jsonb_build_object('name', v.name, 'uuid', v.uuid) as vendor_uuid
        FROM contracts c
        LEFT JOIN vendors v ON c.vendor_uuid = v.uuid
        WHERE c.orgid = $1 AND c.uuid = $2 AND c.deleted_at IS NULL`,
      [req.orgid, req.params.id]
    )).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function updateContract(req, res, next) {
  try {
    const id = req.params.id;
    const payload = req.body || {};
    const getRes = await db.query('SELECT * FROM contracts WHERE uuid = $1 AND deleted_at IS NULL', [id]);
    const row = getRes.rows[0]; if (!row) return res.status(404).json({ error: 'not found' });
    if (row.orgid !== req.orgid) return res.status(403).json({ error: 'org mismatch' });
    const setClauses = Object.keys(payload).map((k, i) => `${k}=$${i + 1}`).join(', ');
    const values = Object.values(payload);
    const sql = `UPDATE contracts SET ${setClauses}, updatedat = current_timestamp, user_id = $${values.length + 1} WHERE uuid = $${values.length + 2} RETURNING *`;
    values.push(req.user ? req.user.user_id : null, id);
    const result = await db.query(sql, values);
    
    // Log Contract update
    await logActivity({
      module: 'ams',
      category: 'config',
      event_type: 'CONTRACT_UPDATED',
      event_label: 'Contract Updated',
      target_type: 'contract',
      target_id: result.rows[0].uuid,
      target_display: getTargetDisplay(result.rows[0], 'contract'),
      changes: {
        old: row,
        new: result.rows[0]
      }
    }, req);
    
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

async function deleteContract(req, res, next) {
  try {
    const id = req.params.id;
    const getRes = await db.query('SELECT * FROM contracts WHERE uuid = $1 AND deleted_at IS NULL', [id]);
    const row = getRes.rows[0]; if (!row) return res.status(404).json({ error: 'not found' });
    if (row.orgid !== req.orgid) return res.status(403).json({ error: 'org mismatch' });
    await db.query('UPDATE contracts SET deleted_at = NOW() WHERE uuid = $1', [id]);
    
    // Log Contract deletion
    await logActivity({
      module: 'ams',
      category: 'config',
      event_type: 'CONTRACT_DELETED',
      event_label: 'Contract Deleted',
      target_type: 'contract',
      target_id: row.uuid,
      target_display: getTargetDisplay(row, 'contract')
    }, req);
    
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { createContract, listContracts, getContract, updateContract, deleteContract };
