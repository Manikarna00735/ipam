const db = require('../../db');
const { logActivity } = require('../../utils/activityLogger');

async function createSites(req, res, next) {
  try {
    const p = req.body || {};
    const sql = `INSERT INTO sites (
      name, slug, description, tagscsv, tenant, tenantgroup,
      region_uuid, location_uuid, physicaladdress, shippingaddress,
      orgid, comments, status, user_id, updatedat
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,current_timestamp) RETURNING *`;
    const values = [
      p.name,
      p.slug,
      p.description || null,
      p.tagscsv || null,
      p.tenant || null,
      p.tenantgroup || null,
      p.region || null,
      p.location || null,
      p.physicaladdress || null,
      p.shippingaddress || null,
      req.orgid || null,
      p.comments || null,
      p.status,
      req.user?.user_id || null
    ];
    const result = await db.query(sql, values);
    
    // Log Site creation
    await logActivity({
      module: 'ipam',
      category: 'config',
      event_type: 'SITE_CREATED',
      event_label: 'Site Created',
      target_type: 'site',
      target_id: result.rows[0].uuid,
      target_display: result.rows[0].name
    }, req);
    
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

async function listSites(req, res, next) {
  try {
    const rows = (await db.query(`SELECT s.uuid, s.name, s.slug, s.description, s.tagscsv, s.tenant, s.tenantgroup, 
      s.physicaladdress, s.shippingaddress, s.comments, s.status, s.createdat, s.updatedat, s.orgid, s.user_id,
      jsonb_build_object('uuid', l.uuid, 'name', l.name) as location_uuid,
      jsonb_build_object('uuid', r.uuid, 'name', r.name) as region_uuid
      FROM sites s
      left join locations l on s.location_uuid = l.uuid
      left join regions r on s.region_uuid = r.uuid
      WHERE s.orgid = $1 AND s.deleted_at IS NULL ORDER BY s.name`, [req.orgid])).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function getSite(req, res, next) {
  try {
    const rows = (await db.query(`SELECT s.uuid, s.name, s.slug, s.description, s.tagscsv, s.tenant, s.tenantgroup, 
      s.physicaladdress, s.shippingaddress, s.comments, s.status, s.createdat, s.updatedat, s.orgid, s.user_id,
      jsonb_build_object('uuid', l.uuid, 'name', l.name) as location_uuid,
      jsonb_build_object('uuid', r.uuid, 'name', r.name) as region_uuid
      FROM sites s
      left join locations l on s.location_uuid = l.uuid
      left join regions r on s.region_uuid = r.uuid
      WHERE s.orgid = $1 AND s.uuid = $2 AND s.deleted_at IS NULL ORDER BY s.name`, [req.orgid, req.params.id])).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function updateSite(req, res, next) {
  try {
    const id = req.params.id;
    const payload = req.body || {};
    const getRes = await db.query('SELECT * FROM sites WHERE uuid = $1 AND deleted_at IS NULL', [id]);
    const row = getRes.rows[0]; if (!row) return res.status(404).json({ error: 'not found' });
    if ((row.orgid || row.org_id) !== req.orgid) return res.status(403).json({ error: 'org mismatch' });

    const keys = Object.keys(payload);
    const values = Object.values(payload);
    let sql, qValues;
    if (keys.length === 0) {
      sql = `UPDATE sites SET updatedat = current_timestamp, user_id = $1 WHERE uuid = $2 RETURNING *`;
      qValues = [req.user?.user_id || null, id];
    } else {
      const setClauses = keys.map((k,i)=>`"${k}"=$${i+1}`).join(', ');
      sql = `UPDATE sites SET ${setClauses}, updatedat = current_timestamp, user_id = $${values.length+1} WHERE uuid = $${values.length+2} RETURNING *`;
      qValues = values.concat([req.user?.user_id || null, id]);
    }
    const result = await db.query(sql, qValues);
    
    // Log Site update
    await logActivity({
      module: 'ipam',
      category: 'config',
      event_type: 'SITE_UPDATED',
      event_label: 'Site Updated',
      target_type: 'site',
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

async function deleteSite(req, res, next) {
  try {
    const id = req.params.id;
    const getRes = await db.query('SELECT * FROM sites WHERE uuid = $1 AND deleted_at IS NULL', [id]);
    const row = getRes.rows[0]; if (!row) return res.status(404).json({ error: 'not found' });
    if ((row.orgid || row.org_id) !== req.orgid) return res.status(403).json({ error: 'org mismatch' });
    await db.query('UPDATE sites SET deleted_at = NOW() WHERE uuid = $1', [id]);
    
    // Log Site deletion
    await logActivity({
      module: 'ipam',
      category: 'config',
      event_type: 'SITE_DELETED',
      event_label: 'Site Deleted',
      target_type: 'site',
      target_id: row.uuid,
      target_display: row.name
    }, req);
    
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = {
  createSites,
  listSites,
  getSite,
  updateSite,
  deleteSite,
};
