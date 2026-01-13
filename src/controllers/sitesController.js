const db = require('../db');

async function createSites(req, res, next) {
  try {
    const p = req.body || {};
    // required fields
    if (!p.name || !p.slug || typeof p.status === 'undefined') {
      return res.status(400).json({ error: 'missing required fields: name, slug, status' });
    }
    const sql = `INSERT INTO sites (
      name, slug, "group", description, asn, tagscsv, tenant, tenantgroup,
      timezone, region, location, facility, physicaladdress, shippingaddress,
      orgid, comments, status, user_id, updatedat
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,current_timestamp) RETURNING *`;
    const values = [
      p.name,
      p.slug,
      p.group || null,
      p.description || null,
      p.asn || null,
      p.tagscsv || null,
      p.tenant || null,
      p.tenantgroup || null,
      p.timezone || null,
      p.region || null,
      p.location || null,
      p.facility || null,
      p.physicaladdress || null,
      p.shippingaddress || null,
      req.orgid || null,
      p.comments || null,
      p.status,
      req.user?.user_id || null
    ];
    const result = await db.query(sql, values);
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

async function listSites(req, res, next) {
  try {
    const rows = (await db.query('SELECT * FROM sites WHERE orgid = $1 ORDER BY name', [req.orgid])).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function getSite(req, res, next) {
  try {
    const rows = (await db.query('SELECT * FROM sites WHERE orgid = $1 and uuid = $2 ORDER BY name', [req.orgid, req.params.id])).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function updateSite(req, res, next) {
  try {
    const id = req.params.id;
    const payload = req.body || {};
    const getRes = await db.query('SELECT * FROM sites WHERE uuid = $1 ', [id]);
    const row = getRes.rows[0]; if (!row) return res.status(404).json({ error: 'not found' });
    if ((row.orgid || row.org_id) !== req.orgid) return res.status(403).json({ error: 'org mismatch' });

    const keys = Object.keys(payload);
    const values = Object.values(payload);
    let sql, qValues;
    if (keys.length === 0) {
      sql = `UPDATE sites SET updatedat = current_timestamp, user_id = $1 WHERE uuid = $2 RETURNING *`;
      qValues = [req.user?.user_id || null, id];
    } else {
      const setClauses = keys.map((k,i)=>`${k}=$${i+1}`).join(', ');
      sql = `UPDATE sites SET ${setClauses}, updatedat = current_timestamp, user_id = $${values.length+1} WHERE uuid = $${values.length+2} RETURNING *`;
      qValues = values.concat([req.user?.user_id || null, id]);
    }
    const result = await db.query(sql, qValues);
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

async function deleteSite(req, res, next) {
  try {
    const id = req.params.id;
    const getRes = await db.query('SELECT * FROM sites WHERE uuid = $1 ', [id]);
    const row = getRes.rows[0]; if (!row) return res.status(404).json({ error: 'not found' });
    if ((row.orgid || row.org_id) !== req.orgid) return res.status(403).json({ error: 'org mismatch' });
    await db.query('DELETE FROM sites WHERE uuid = $1', [id]);
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
