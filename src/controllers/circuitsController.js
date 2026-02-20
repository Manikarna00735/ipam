const db = require('../db');
const { logActivity, getTargetDisplay } = require('../utils/activityLogger');

async function createCircuits(req, res, next) {
  try {
    const payload = req.body || {};
    const sql = `INSERT INTO circuits (commitrate,customerip, description, gatewayip, installed, ordernumber,
    provider_uuid, provideraccount,tags, tenant, terminates, type, status, comments, orgid, user_id, updatedat) 
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,current_timestamp) RETURNING *`;
    const values = [payload.commitrate || null,
    payload.customerip || null, payload.description || null, payload.gatewayip || null,
    payload.installed || null, payload.ordernumber, payload.provider_uuid,
    payload.provideraccount || null, payload.tags || null, payload.tenant || null,
    payload.terminates || null,
    payload.type, payload.status, payload?.comments || null, req.orgid, req.user ? req.user.user_id : null];
    const result = await db.query(sql, values);
    
    // Log Circuit creation
    await logActivity({
      module: 'ipam',
      category: 'config',
      event_type: 'CIRCUIT_CREATED',
      event_label: 'Circuit Created',
      target_type: 'circuit',
      target_id: result.rows[0].uuid,
      target_display: getTargetDisplay(result.rows[0], 'circuit')
    }, req);
    
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

async function listCircuits(req, res, next) {
  try {
    const rows = (await db.query(`SELECT c.uuid, c.commitrate, c.customerip, c.description, c.gatewayip, c.installed, c.ordernumber,
      jsonb_build_object('uuid', p.uuid, 'name', p.name) as provider_uuid, c.provideraccount, c.tags, c.tenant, c.terminates, c.type, c.status, c.comments, c.orgid, c.user_id, 
      c.createdat, c.updatedat
      FROM circuits c
      left JOIN providers p ON c.provider_uuid = p.uuid
      WHERE c.orgid = $1 ORDER BY c.uuid`, [req.orgid])).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function getCircuit(req, res, next) {
  try {
    const rows = (await db.query(`SELECT c.uuid, c.commitrate, c.customerip, c.description, c.gatewayip, c.installed, c.ordernumber,
      jsonb_build_object('uuid', p.uuid, 'name', p.name) as provider_uuid, c.provideraccount, c.tags, c.tenant, c.terminates, c.type, c.status, c.comments, c.orgid, c.user_id, 
      c.createdat, c.updatedat
      FROM circuits c
      left JOIN providers p ON c.provider_uuid = p.uuid
      WHERE c.orgid = $1 and c.uuid = $2 ORDER BY c.uuid`, [req.orgid, req.params.id])).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function updateCircuit(req, res, next) {
  try {
    const id = req.params.id;
    const payload = req.body || {};
    const getRes = await db.query('SELECT * FROM circuits WHERE uuid = $1 ', [id]);
    const row = getRes.rows[0]; if (!row) return res.status(404).json({ error: 'not found' });
    if (row.orgid !== req.orgid) return res.status(403).json({ error: 'org mismatch' });
    const setClauses = Object.keys(payload).map((k,i)=>`${k}=$${i+1}`).join(', ');
    const values = Object.values(payload);
    const sql = `UPDATE circuits SET ${setClauses}, updatedat = current_timestamp, user_id = $${values.length+1} WHERE uuid = $${values.length+2} RETURNING *`;
    values.push(req.user ? req.user.user_id : null, id);
    const result = await db.query(sql, values);
    
    // Log Circuit update
    await logActivity({
      module: 'ipam',
      category: 'config',
      event_type: 'CIRCUIT_UPDATED',
      event_label: 'Circuit Updated',
      target_type: 'circuit',
      target_id: result.rows[0].uuid,
      target_display: getTargetDisplay(result.rows[0], 'circuit'),
      changes: {
        old: row,
        new: result.rows[0]
      }
    }, req);
    
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

async function deleteCircuit(req, res, next) {
  try {
    const id = req.params.id;
    const getRes = await db.query('SELECT * FROM circuits WHERE uuid = $1 ', [id]);
    const row = getRes.rows[0]; if (!row) return res.status(404).json({ error: 'not found' });
    if (row.orgid !== req.orgid) return res.status(403).json({ error: 'org mismatch' });
    await db.query('DELETE FROM circuits WHERE uuid = $1', [id]);
    
    // Log Circuit deletion
    await logActivity({
      module: 'ipam',
      category: 'config',
      event_type: 'CIRCUIT_DELETED',
      event_label: 'Circuit Deleted',
      target_type: 'circuit',
      target_id: row.uuid,
      target_display: getTargetDisplay(row, 'circuit')
    }, req);
    
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = {
  createCircuits,
  listCircuits,
  getCircuit,
  updateCircuit,
  deleteCircuit,
};
