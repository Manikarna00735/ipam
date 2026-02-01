const db = require('../db');

async function createDevices(req, res, next) {
  try {
    const payload = req.body || {};
    const sql = `INSERT INTO devices (name, site_uuid, devicetype, role, description, assettag, tag, 
    tenant, tenantgroup, manufacturer_uuid, interfaces, ips, airflow, cluster, face, 
    platform_uuid, rack_uuid, serialno, services, location_uuid, position, 
    virtualchassis, docid, orgid, comments, user_id, updatedat) 
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,
    $22,$23,$24,$25,$26,current_timestamp) RETURNING *`;
    const values = [payload.name, payload.site_uuid, payload.devicetype || null,
      payload.role || null, payload?.description || null, 
      payload?.assettag || null, payload?.tag || null, payload?.tenant || null,
      payload?.tenantgroup || null, payload?.manufacturer || null, payload?.interfaces || null,
      payload?.ips || null,payload?.airflow || null, payload?.cluster || null, 
      payload?.face || null, payload?.platform || null,
      payload?.rack || null, payload?.serialno || null, payload?.services || null,
      payload?.location || null, payload?.position || null, payload?.virtualchassis || null, 
      payload?.docid || null, req.orgid, payload?.comments || null, 
      req.user ? req.user.user_id : null];
    const result = await db.query(sql, values);
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

async function listDevices(req, res, next) {
  try {
    const rows = (await db.query(`SELECT d.name, d.uuid, d.devicetype, d.role, d.description, d.assettag, d.tag, 
      d.tenant, d.tenantgroup, d.interfaces, d.ips, d.airflow, d.cluster, d.face, 
      d.serialno, d.services, d.position, d.virtualchassis, d.orgid, d.comments, 
      d.createdat, d.updatedat, d.user_id,
      Jsonb_build_object('name', s.name, 'uuid', s.uuid) as site,
      Jsonb_build_object('name', m.name, 'uuid', m.uuid) as manufacturer,
      Jsonb_build_object('name', p.name, 'uuid', p.uuid) as platform,
      Jsonb_build_object('name', r.name, 'uuid', r.uuid) as rack,
      Jsonb_build_object('name', l.name, 'uuid', l.uuid) as location
      FROM devices d
      left join sites s on d.site_uuid = s.uuid
      left join manufacturers m on d.manufacturer_uuid = m.uuid
      left join platforms p on d.platform_uuid = p.uuid
      left join racks r on d.rack_uuid = r.uuid
      left join locations l on d.location_uuid = l.uuid
      WHERE d.orgid = $1 ORDER BY d.name`, [req.orgid])).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function getDevice(req, res, next) {
  try {
    const rows = (await db.query(`SELECT d.name, d.uuid, d.devicetype, d.role, d.description, d.assettag, d.tag, 
      d.tenant, d.tenantgroup, d.interfaces, d.ips, d.airflow, d.cluster, d.face, 
      d.serialno, d.services, d.position, d.virtualchassis, d.orgid, d.comments, 
      d.createdat, d.updatedat, d.user_id,
      Jsonb_build_object('name', s.name, 'uuid', s.uuid) as site,
      Jsonb_build_object('name', m.name, 'uuid', m.uuid) as manufacturer,
      Jsonb_build_object('name', p.name, 'uuid', p.uuid) as platform,
      Jsonb_build_object('name', r.name, 'uuid', r.uuid) as rack,
      Jsonb_build_object('name', l.name, 'uuid', l.uuid) as location
      FROM devices d
      left join sites s on d.site_uuid = s.uuid
      left join manufacturers m on d.manufacturer_uuid = m.uuid
      left join platforms p on d.platform_uuid = p.uuid
      left join racks r on d.rack_uuid = r.uuid
      left join locations l on d.location_uuid = l.uuid
      WHERE d.orgid = $1 and d.uuid = $2 ORDER BY d.name`, [req.orgid, req.params.id])).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function updateDevice(req, res, next) {
  try {
    const id = req.params.id;
    const payload = req.body || {};
    const getRes = await db.query('SELECT * FROM devices WHERE uuid = $1 ', [id]);
    const row = getRes.rows[0]; if (!row) return res.status(404).json({ error: 'not found' });
    if (row.orgid !== req.orgid) return res.status(403).json({ error: 'org mismatch' });
    const setClauses = Object.keys(payload).map((k,i)=>`${k}=$${i+1}`).join(', ');
    const values = Object.values(payload);
    const sql = `UPDATE devices SET ${setClauses}, updatedat = current_timestamp, user_id = $${values.length+1} WHERE uuid = $${values.length+2} RETURNING *`;
    values.push(req.user ? req.user.user_id : null, id);
    const result = await db.query(sql, values);
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

async function deleteDevice(req, res, next) {
  try {
    const id = req.params.id;
    const getRes = await db.query('SELECT * FROM devices WHERE uuid = $1 ', [id]);
    const row = getRes.rows[0]; if (!row) return res.status(404).json({ error: 'not found' });
    if (row.orgid !== req.orgid) return res.status(403).json({ error: 'org mismatch' });
    await db.query('DELETE FROM devices WHERE uuid = $1', [id]);
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = {
  createDevices,
  listDevices,
  getDevice,
  updateDevice,
  deleteDevice,
};
