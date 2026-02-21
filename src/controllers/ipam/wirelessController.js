const db = require('../../db');
const { logActivity, getTargetDisplay } = require('../../utils/activityLogger');

async function createWireless(req, res, next) {
  try {
    const payload = req.body || {};
    const sql = `INSERT INTO wireless (ssid, description, tag, tenant, tenantgroup, vlan_uuid, "group",
     presharekey, authtype, authcipher, interfaces, orgid, comments, status,
     updatedat, user_id) 
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,current_timestamp,$15) RETURNING *`;
    const values = [payload.ssid, payload.description || null, payload.tag || null, 
      payload.tenant || null, payload.tenantgroup || null, payload.vlan || null, payload.group || null,
      payload.presharekey || null, payload.authtype || null, payload.authcipher || null, 
      payload.interfaces || null, req.orgid, payload.comments || null, 
      payload.status || null, req.user ? req.user.user_id : null];
    const result = await db.query(sql, values);
    
    // Log Wireless creation
    await logActivity({
      module: 'dcim',
      category: 'config',
      event_type: 'WIRELESS_CREATED',
      event_label: 'Wireless Created',
      target_type: 'wireless',
      target_id: result.rows[0].uuid,
      target_display: getTargetDisplay(result.rows[0], 'wireless')
    }, req);
    
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

async function listWireless(req, res, next) {
  try {
    const rows = (await db.query(`SELECT w.uuid, w.ssid, w.description, w.tag, w.tenant, w.tenantgroup,
      w."group", w.presharekey, w.authtype, w.authcipher, w.interfaces, w.orgid,
      w.comments, w.status, w.updatedat, w.user_id,
      jsonb_build_object('uuid', v.uuid, 'name', v.name) AS vlan_uuid
      FROM wireless w
      left join vlans v on w.vlan_uuid = v.uuid
      WHERE w.orgid = $1 ORDER BY w.ssid`, [req.orgid])).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function getWireless(req, res, next) {
  try {
    const rows = (await db.query(`SELECT w.uuid, w.ssid, w.description, w.tag, w.tenant, w.tenantgroup,
      w."group", w.presharekey, w.authtype, w.authcipher, w.interfaces, w.orgid,
      w.comments, w.status, w.updatedat, w.user_id,
      jsonb_build_object('uuid', v.uuid, 'name', v.name) AS vlan_uuid
      FROM wireless w
      left join vlans v on w.vlan_uuid = v.uuid
      WHERE w.orgid = $1 and w.uuid = $2 ORDER BY w.ssid`, [req.orgid, req.params.id])).rows;
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
    const setClauses = Object.keys(payload).map((k,i)=>`"${k}"=$${i+1}`).join(', ');
    const values = Object.values(payload);
    const sql = `UPDATE wireless SET ${setClauses}, updatedat = current_timestamp, user_id = $${values.length+1} WHERE uuid = $${values.length+2} RETURNING *`;
    values.push(req.user ? req.user.user_id : null, id);
    const result = await db.query(sql, values);
    
    // Log Wireless update
    await logActivity({
      module: 'dcim',
      category: 'config',
      event_type: 'WIRELESS_UPDATED',
      event_label: 'Wireless Updated',
      target_type: 'wireless',
      target_id: result.rows[0].uuid,
      target_display: getTargetDisplay(result.rows[0], 'wireless'),
      changes: {
        old: row,
        new: result.rows[0]
      }
    }, req);
    
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
    
    // Log Wireless deletion
    await logActivity({
      module: 'dcim',
      category: 'config',
      event_type: 'WIRELESS_DELETED',
      event_label: 'Wireless Deleted',
      target_type: 'wireless',
      target_id: row.uuid,
      target_display: getTargetDisplay(row, 'wireless')
    }, req);
    
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
