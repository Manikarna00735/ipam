const db = require('../db');

async function createInterfaces(req, res, next) {
  try {
    const payload = req.body || {};
    const sql = `INSERT INTO interfaces (
      name, device_uuid, type, description, speed, bridgeinterface, channelfrequency, channelwidth,
      laginterface, label, mac, mtu, parentinterface, poemode, poetype, tags,
      transmitpower, vrf_uuid, virtualdevicecontext, wirelesschannel, wirelesslangroup, wirelessrole,
      orgid, comments, createdat, updatedat, user_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,
      current_timestamp,current_timestamp,$25) RETURNING *`;
    const values = [
      payload.name,
      payload.device_uuid || null,
      payload.type || null,
      payload.description || null,
      payload.speed || null,
      payload.bridgeinterface || null,
      payload.channelfrequency || null,
      payload.channelwidth || null,
      payload.laginterface || null,
      payload.label || null,
      payload.mac || null,
      payload.mtu || null,
      payload.parentinterface || null,
      payload.poemode || null,
      payload.poetype || null,
      payload.tags || payload.tagscsv || null,
      payload.transmitpower || null,
      payload.vrf_uuid || null,
      payload.virtualdevicecontext || null,
      payload.wirelesschannel || null,
      payload.wirelesslangroup || null,
      payload.wirelessrole || null,
      req.orgid,
      payload.comments || null,
      req.user ? req.user.user_id : null
    ];
    const result = await db.query(sql, values);
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}

async function listInterfaces(req, res, next) {
  try {
    // const rows = (await db.query(`SELECT f.uuid, f.name, f.type, f.description, f.speed, f.bridgeinterface, f.channelfrequency,
    //   f.channelwidth, f.laginterface, f.label, f.mac, f.mtu, f.parentinterface, f.poemode, f.poetype, f.tags,
    //   f.transmitpower, f.virtualdevicecontext, f.wirelesschannel, f.wirelesslangroup, f.wirelessrole,
    //   f.orgid, f.comments, f.createdat, f.updatedat,f.user_id,
    //   json_build_object('uuid', d.uuid,'name', d.name) as device,
    //   json_build_object('uuid', v.uuid,'name', v.name) as vrf
    //   FROM interfaces f
    //   left JOIN devices d ON f.device_uuid = d.uuid
    //   left JOIN vrfs v ON f.vrf_uuid = v.uuid
    //   WHERE f.orgid = $1 ORDER BY f.name`, [req.orgid])).rows;
    const rows = (await db.query(`SELECT * FROM interfaces WHERE orgid = $1 ORDER BY name`, [req.orgid])).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function getInterface(req, res, next) {
  try {
    // const rows = (await db.query(`select f.uuid, f.name, f.type, f.description, f.speed, f.bridgeinterface, f.channelfrequency,
    //   f.channelwidth, f.laginterface, f.label, f.mac, f.mtu, f.parentinterface, f.poemode, f.poetype, f.tags,
    //   f.transmitpower, f.virtualdevicecontext, f.wirelesschannel, f.wirelesslangroup, f.wirelessrole,
    //   f.orgid, f.comments, f.createdat, f.updatedat,f.user_id,
    //   json_build_object('uuid', d.uuid,'name', d.name) as device,
    //   json_build_object('uuid', v.uuid,'name', v.name) as vrf
    //   FROM interfaces f
    //   left JOIN devices d ON f.device_uuid = d.uuid
    //   left JOIN vrfs v ON f.vrf_uuid = v.uuid
    //   WHERE f.orgid = $1 and f.uuid = $2 ORDER BY f.name`, [req.orgid, req.params.id])).rows;
    const rows = (await db.query(`SELECT * FROM interfaces WHERE orgid = $1 AND uuid = $2 ORDER BY name`, [req.orgid, req.params.id])).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function updateInterface(req, res, next) {
  try {
    const id = req.params.id;
    const payload = req.body || {};
    const getRes = await db.query('SELECT * FROM interfaces WHERE uuid = $1 ', [id]);
    const row = getRes.rows[0]; if (!row) return res.status(404).json({ error: 'not found' });
    if (row.orgid !== req.orgid) return res.status(403).json({ error: 'org mismatch' });
    const setClauses = Object.keys(payload).map((k,i)=>`${k}=$${i+1}`).join(', ');
    const values = Object.values(payload);
    const sql = `UPDATE interfaces SET ${setClauses}, updatedat = current_timestamp, user_id = $${values.length+1} WHERE uuid = $${values.length+2} RETURNING *`;
    values.push(req.user ? req.user.user_id : null, id);
    const result = await db.query(sql, values);
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

async function deleteInterface(req, res, next) {
  try {
    const id = req.params.id;
    const getRes = await db.query('SELECT * FROM interfaces WHERE uuid = $1 ', [id]);
    const row = getRes.rows[0]; if (!row) return res.status(404).json({ error: 'not found' });
    if (row.orgid !== req.orgid) return res.status(403).json({ error: 'org mismatch' });
    await db.query('DELETE FROM interfaces WHERE uuid = $1', [id]);
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = {
  createInterfaces,
  listInterfaces,
  getInterface,
  updateInterface,
  deleteInterface,
};
