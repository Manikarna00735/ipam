const db = require('../db');
const ipUtils = require('../utils/ipUtils');
const realtime = require('../realtime');

async function createPrefix(req, res, next) {
  try {
    const payload = req.body || {};
    if (!payload.prefix) return res.status(400).json({ error: 'prefix required' });
    const sql = `INSERT INTO prefixes (org_id, created_by, created_at, updated_at, status, prefix, vrf, tenant, site, vlan, role) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`;
    const values = [req.orgId, req.user ? req.user.id : null, new Date(), new Date(), payload.status || null, payload.prefix, payload.vrf || null, payload.tenant || null, payload.site || null, payload.vlan || null, payload.role || null];
    const result = await db.query(sql, values);
    const created = result.rows[0];
    try { realtime.emit('prefixes:created', created); } catch (e) {}
    res.status(201).json(created);
  } catch (err) { next(err); }
}

async function listPrefixes(req, res, next) {
  try {
    const rows = (await db.query('SELECT * FROM prefixes WHERE org_id = $1 ORDER BY id', [req.orgId])).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function updatePrefix(req, res, next) {
  try {
    const id = req.params.id;
    const payload = req.body || {};
    const getRes = await db.query('SELECT * FROM prefixes WHERE id = $1', [id]);
    const row = getRes.rows[0]; if (!row) return res.status(404).json({ error: 'not found' });
    if (row.org_id !== req.orgId) return res.status(403).json({ error: 'org mismatch' });
    const setClauses = Object.keys(payload).map((k,i)=>`${k}=$${i+1}`).join(', ');
    const values = Object.values(payload);
    const sql = `UPDATE prefixes SET ${setClauses}, updated_at = $${values.length+1} WHERE id = $${values.length+2} RETURNING *`;
    values.push(new Date(), id);
    const result = await db.query(sql, values);
    const updated = result.rows[0];
    try { realtime.emit('prefixes:updated', updated); } catch (e) {}
    res.json(updated);
  } catch (err) { next(err); }
}

async function deletePrefix(req, res, next) {
  try {
    const id = req.params.id;
    const getRes = await db.query('SELECT * FROM prefixes WHERE id = $1', [id]);
    const row = getRes.rows[0]; if (!row) return res.status(404).json({ error: 'not found' });
    if (row.org_id !== req.orgId) return res.status(403).json({ error: 'org mismatch' });
    await db.query('DELETE FROM prefixes WHERE id = $1', [id]);
    try { realtime.emit('prefixes:deleted', { id, org_id: row.org_id }); } catch (e) {}
    res.status(204).send();
  } catch (err) { next(err); }
}

// Subnets
async function createSubnet(req, res, next) {
  try {
    const prefixId = req.params.id;
    const payload = req.body || {};
    if (!payload.subnet) return res.status(400).json({ error: 'subnet required' });
    const pRes = await db.query('SELECT * FROM prefixes WHERE id = $1', [prefixId]);
    const prefix = pRes.rows[0]; if (!prefix) return res.status(404).json({ error: 'prefix not found' });
    if (prefix.org_id !== req.orgId) return res.status(403).json({ error: 'org mismatch' });
    if (!ipUtils.cidrContains(prefix.prefix, payload.subnet)) return res.status(400).json({ error: 'subnet not within prefix' });
    const sql = `INSERT INTO subnets (org_id, prefix_id, subnet, status, vrf, tenant, site, vlan, role, created_by, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`;
    const values = [req.orgId, prefixId, payload.subnet, payload.status || null, payload.vrf || null, payload.tenant || null, payload.site || null, payload.vlan || null, payload.role || null, req.user ? req.user.id : null, new Date(), new Date()];
    const result = await db.query(sql, values);
    const created = result.rows[0];
    await db.query('UPDATE prefixes SET children_count = coalesce(children_count,0) + 1 WHERE id = $1', [prefixId]);
    try { realtime.emit('subnets:created', created); realtime.emit('prefixes:updated', { id: prefixId }); } catch (e) {}
    res.status(201).json(created);
  } catch (err) { next(err); }
}

async function listSubnets(req, res, next) {
  try {
    const prefixId = req.params.id;
    const rows = (await db.query('SELECT * FROM subnets WHERE prefix_id = $1 AND org_id = $2 ORDER BY id', [prefixId, req.orgId])).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function updateSubnet(req, res, next) {
  try {
    const { id: prefixId, subnetId } = req.params;
    const payload = req.body || {};
    const sRes = await db.query('SELECT * FROM subnets WHERE id = $1', [subnetId]);
    const subnet = sRes.rows[0]; if (!subnet) return res.status(404).json({ error: 'subnet not found' });
    if (subnet.org_id !== req.orgId) return res.status(403).json({ error: 'org mismatch' });
    if (payload.subnet) {
      const pRes = await db.query('SELECT * FROM prefixes WHERE id = $1', [prefixId]);
      const prefix = pRes.rows[0]; if (!prefix) return res.status(404).json({ error: 'prefix not found' });
      if (!ipUtils.cidrContains(prefix.prefix, payload.subnet)) return res.status(400).json({ error: 'subnet not within prefix' });
    }
    const setClauses = Object.keys(payload).map((k,i)=>`${k}=$${i+1}`).join(', ');
    const values = Object.values(payload);
    const sql = `UPDATE subnets SET ${setClauses}, updated_at = $${values.length+1} WHERE id = $${values.length+2} RETURNING *`;
    values.push(new Date(), subnetId);
    const result = await db.query(sql, values);
    const updated = result.rows[0];
    try { realtime.emit('subnets:updated', updated); } catch (e) {}
    res.json(updated);
  } catch (err) { next(err); }
}

async function deleteSubnet(req, res, next) {
  try {
    const { id: prefixId, subnetId } = req.params;
    const sRes = await db.query('SELECT * FROM subnets WHERE id = $1', [subnetId]);
    const subnet = sRes.rows[0]; if (!subnet) return res.status(404).json({ error: 'subnet not found' });
    if (subnet.org_id !== req.orgId) return res.status(403).json({ error: 'org mismatch' });
    await db.query('DELETE FROM subnets WHERE id = $1', [subnetId]);
    await db.query('UPDATE prefixes SET children_count = GREATEST(coalesce(children_count,0) - 1, 0) WHERE id = $1', [prefixId]);
    try { realtime.emit('subnets:deleted', { id: subnetId, org_id: subnet.org_id }); realtime.emit('prefixes:updated', { id: prefixId }); } catch (e) {}
    res.status(204).send();
  } catch (err) { next(err); }
}

// IPs
async function createIp(req, res, next) {
  try {
    const { id: prefixId, subnetId } = req.params;
    const payload = req.body || {};
    if (!payload.ip) return res.status(400).json({ error: 'ip required' });
    const sRes = await db.query('SELECT * FROM subnets WHERE id = $1', [subnetId]);
    const subnet = sRes.rows[0]; if (!subnet) return res.status(404).json({ error: 'subnet not found' });
    if (subnet.org_id !== req.orgId) return res.status(403).json({ error: 'org mismatch' });
    if (!ipUtils.ipInCidr(payload.ip, subnet.subnet)) return res.status(400).json({ error: 'ip not in subnet' });
    const ex = await db.query('SELECT id FROM ips WHERE subnet_id = $1 AND ip = $2', [subnetId, payload.ip]);
    if (ex.rows.length) return res.status(409).json({ error: 'ip already exists' });
    const sql = `INSERT INTO ips (org_id, subnet_id, ip, created_by, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`;
    const values = [req.orgId, subnetId, payload.ip, req.user ? req.user.id : null, new Date(), new Date()];
    const result = await db.query(sql, values);
    const created = result.rows[0];
    try { realtime.emit('ips:created', created); } catch (e) {}
    res.status(201).json(created);
  } catch (err) { next(err); }
}

async function batchCreateIps(req, res, next) {
  try {
    const { id: prefixId, subnetId } = req.params;
    const payload = req.body || {};
    const ips = Array.isArray(payload.ips) ? payload.ips : [];
    if (!ips.length) return res.status(400).json({ error: 'ips array required' });
    const sRes = await db.query('SELECT * FROM subnets WHERE id = $1', [subnetId]);
    const subnet = sRes.rows[0]; if (!subnet) return res.status(404).json({ error: 'subnet not found' });
    if (subnet.org_id !== req.orgId) return res.status(403).json({ error: 'org mismatch' });
    const inserted = [];
    await db.pool.query('BEGIN');
    try {
      for (const ipAddr of ips) {
        if (!ipUtils.ipInCidr(ipAddr, subnet.subnet)) continue;
        const ex = await db.query('SELECT id FROM ips WHERE subnet_id = $1 AND ip = $2', [subnetId, ipAddr]);
        if (ex.rows.length) continue;
        const r = await db.query('INSERT INTO ips (org_id, subnet_id, ip, created_by, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *', [req.orgId, subnetId, ipAddr, req.user ? req.user.id : null, new Date(), new Date()]);
        inserted.push(r.rows[0]);
      }
      await db.pool.query('COMMIT');
    } catch (e) {
      await db.pool.query('ROLLBACK');
      throw e;
    }
    try { realtime.emit('ips:batch_created', { subnetId, items: inserted }); } catch (e) {}
    res.status(201).json({ inserted });
  } catch (err) { next(err); }
}

async function listIps(req, res, next) {
  try {
    const { subnetId } = req.params;
    const rows = (await db.query('SELECT * FROM ips WHERE subnet_id = $1 AND org_id = $2 ORDER BY ip ASC', [subnetId, req.orgId])).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function updateIp(req, res, next) {
  try {
    const { ipId } = req.params;
    const payload = req.body || {};
    const getRes = await db.query('SELECT * FROM ips WHERE id = $1', [ipId]);
    const row = getRes.rows[0]; if (!row) return res.status(404).json({ error: 'not found' });
    if (row.org_id !== req.orgId) return res.status(403).json({ error: 'org mismatch' });
    if (payload.ip && !ipUtils.ipInCidr(payload.ip, row.subnet)) return res.status(400).json({ error: 'ip not in subnet' });
    const setClauses = Object.keys(payload).map((k,i)=>`${k}=$${i+1}`).join(', ');
    const values = Object.values(payload);
    const sql = `UPDATE ips SET ${setClauses}, updated_at = $${values.length+1} WHERE id = $${values.length+2} RETURNING *`;
    values.push(new Date(), ipId);
    const result = await db.query(sql, values);
    const updated = result.rows[0];
    try { realtime.emit('ips:updated', updated); } catch (e) {}
    res.json(updated);
  } catch (err) { next(err); }
}

async function deleteIp(req, res, next) {
  try {
    const { ipId } = req.params;
    const getRes = await db.query('SELECT * FROM ips WHERE id = $1', [ipId]);
    const row = getRes.rows[0]; if (!row) return res.status(404).json({ error: 'not found' });
    if (row.org_id !== req.orgId) return res.status(403).json({ error: 'org mismatch' });
    await db.query('DELETE FROM ips WHERE id = $1', [ipId]);
    try { realtime.emit('ips:deleted', { id: ipId, org_id: row.org_id }); } catch (e) {}
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = {
  createPrefix, listPrefixes, updatePrefix, deletePrefix,
  createSubnet, listSubnets, updateSubnet, deleteSubnet,
  createIp, batchCreateIps, listIps, updateIp, deleteIp,
};
