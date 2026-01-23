const db = require('../db');

async function createRacks(req, res, next) {
  try {
    const payload = req.body || {};
    const sql = `INSERT INTO racks (name, slug, site, description, comments, assettag,
    tagscsv, 
    tenant,
    facilityid,
    role,
    type,
    location,
    heightu,
    widthin,
    maxweightkg,
    rackweightkg,
    totalweightkg,
    mountingdepthmm,
    outerdepthmm,
    outerwidthmm,
    powerutilization,
    spaceutilization,
    serialnumber,
    devices,
    status, orgid, user_id, updatedat) 
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,current_timestamp) RETURNING *`;
    const values = [payload.name, payload.slug, payload.site, payload?.description || null, payload?.comments || null, 
    payload?.assettag || null,
    payload?.tagscsv || null, 
    payload?.tenant || null,
    payload?.facilityid || null,
    payload?.role || null,
    payload?.type || null,
    payload?.location || null,
    payload?.heightu || null,
    payload?.widthin || null,
    payload?.maxweightkg || null,
    payload?.rackweightkg || null,
    payload?.totalweightkg || null,
    payload?.mountingdepthmm || null,
    payload?.outerdepthmm || null,
    payload?.outerwidthmm || null,
    payload?.powerutilization || null,
    payload?.spaceutilization || null,
    payload?.serialnumber || null,
    payload?.devices || null,
    payload.status,
    req.orgid, req.user ? req.user.user_id : null];
    const result = await db.query(sql, values);
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

async function listRacks(req, res, next) {
  try {
    const rows = (await db.query('SELECT * FROM racks WHERE orgid = $1 ORDER BY name', [req.orgid])).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function getRack(req, res, next) {
  try {
    const rows = (await db.query('SELECT * FROM racks WHERE orgid = $1 and uuid = $2 ORDER BY name', [req.orgid, req.params.id])).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function updateRack(req, res, next) {
  try {
    const id = req.params.id;
    const payload = req.body || {};
    const getRes = await db.query('SELECT * FROM racks WHERE uuid = $1 ', [id]);
    const row = getRes.rows[0]; if (!row) return res.status(404).json({ error: 'not found' });
    if (row.orgid !== req.orgid) return res.status(403).json({ error: 'org mismatch' });
    const setClauses = Object.keys(payload).map((k,i)=>`${k}=$${i+1}`).join(', ');
    const values = Object.values(payload);
    const sql = `UPDATE racks SET ${setClauses}, updatedat = current_timestamp, user_id = $${values.length+1} WHERE uuid = $${values.length+2} RETURNING *`;
    values.push(req.user ? req.user.user_id : null, id);
    const result = await db.query(sql, values);
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

async function deleteRack(req, res, next) {
  try {
    const id = req.params.id;
    const getRes = await db.query('SELECT * FROM racks WHERE uuid = $1 ', [id]);
    const row = getRes.rows[0]; if (!row) return res.status(404).json({ error: 'not found' });
    if (row.orgid !== req.orgid) return res.status(403).json({ error: 'org mismatch' });
    await db.query('DELETE FROM racks WHERE uuid = $1', [id]);
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = {
  createRacks,
  listRacks,
  getRack,
  updateRack,
  deleteRack,
};
