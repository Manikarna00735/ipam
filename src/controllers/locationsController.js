const db = require('../db');
const { logActivity } = require('../utils/activityLogger');

async function createLocations(req, res, next) {
  try {
    const payload = req.body || {};
    const sql = `INSERT INTO locations (name, slug, description, site_uuid, rackscount, 
    devicescount, tagscsv, tenant, tenantgroup, orgid, status, updatedat, user_id) 
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,current_timestamp,$12) RETURNING *`;
    const values = [payload.name, payload.slug, payload?.description || null, payload?.site_uuid || null,
       payload?.rackscount || null, payload?.devicescount || null, payload?.tagscsv || null, 
       payload?.tenant || null, payload?.tenantgroup || null, req.orgid, payload?.status || null, 
       req.user ? req.user.user_id : null];
    const result = await db.query(sql, values);
    
    // Log Location creation
    await logActivity({
      module: 'ipam',
      category: 'config',
      event_type: 'LOCATION_CREATED',
      event_label: 'Location Created',
      target_type: 'location',
      target_id: result.rows[0].uuid,
      target_display: result.rows[0].name
    }, req);
    
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

async function listLocations(req, res, next) {
  try {
    const rows = (await db.query(`SELECT l.uuid, l.name, l.slug, l.description, l.rackscount, 
      l.devicescount, l.tagscsv, l.tenant, l.tenantgroup, l.orgid, l.status, l.createdat, l.updatedat, l.user_id,
      jsonb_build_object('uuid', s.uuid, 'name', s.name) as site_uuid
      FROM locations l 
      left join sites s on l.site_uuid = s.uuid
      WHERE l.orgid = $1 ORDER BY l.name`, [req.orgid])).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function getLocation(req, res, next) {
  try {
    const rows = (await db.query(`SELECT l.uuid, l.name, l.slug, l.description, l.rackscount, 
      l.devicescount, l.tagscsv, l.tenant, l.tenantgroup, l.orgid, l.status, l.createdat, l.updatedat, l.user_id,
      jsonb_build_object('uuid', s.uuid, 'name', s.name) as site_uuid
      FROM locations l 
      left join sites s on l.site_uuid = s.uuid
      WHERE l.orgid = $1 and l.uuid = $2 ORDER BY l.name`, [req.orgid, req.params.id])).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function updateLocation(req, res, next) {
  try {
    const id = req.params.id;
    const payload = req.body || {};
    const getRes = await db.query('SELECT * FROM locations WHERE uuid = $1 ', [id]);
    const row = getRes.rows[0]; if (!row) return res.status(404).json({ error: 'not found' });
    if (row.orgid !== req.orgid) return res.status(403).json({ error: 'org mismatch' });
    const setClauses = Object.keys(payload).map((k,i)=>`${k}=$${i+1}`).join(', ');
    const values = Object.values(payload);
    const sql = `UPDATE locations SET ${setClauses}, updatedat = current_timestamp, user_id = $${values.length+1} WHERE uuid = $${values.length+2} RETURNING *`;
    values.push(req.user ? req.user.user_id : null, id);
    const result = await db.query(sql, values);
    
    // Log Location update
    await logActivity({
      module: 'ipam',
      category: 'config',
      event_type: 'LOCATION_UPDATED',
      event_label: 'Location Updated',
      target_type: 'location',
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

async function deleteLocation(req, res, next) {
  try {
    const id = req.params.id;
    const getRes = await db.query('SELECT * FROM locations WHERE uuid = $1 ', [id]);
    const row = getRes.rows[0]; if (!row) return res.status(404).json({ error: 'not found' });
    if (row.orgid !== req.orgid) return res.status(403).json({ error: 'org mismatch' });
    await db.query('DELETE FROM locations WHERE uuid = $1', [id]);
    
    // Log Location deletion
    await logActivity({
      module: 'ipam',
      category: 'config',
      event_type: 'LOCATION_DELETED',
      event_label: 'Location Deleted',
      target_type: 'location',
      target_id: row.uuid,
      target_display: row.name
    }, req);
    
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = {
  createLocations,
  listLocations,
  getLocation,
  updateLocation,
  deleteLocation,
};
