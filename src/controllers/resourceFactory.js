const db = require('../db');
const { ensureOrgMatches } = require('../middleware/org');
const realtime = require('../realtime');

function resourceFactory({ table, requiredFields = [], slugUnique = false }) {
  async function list(req, res, next) {
    try {
      const rows = (await db.query(`SELECT * FROM ${table} WHERE org_id = $1 ORDER BY id`, [req.orgid])).rows;
      res.json({ items: rows });
    } catch (err) {
      next(err);
    }
  }

  async function get(req, res, next) {
    try {
      const id = req.params.id;
      const result = await db.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
      const row = result.rows[0];
      if (!row) return res.status(404).json({ error: 'not found' });
      if (!ensureOrgMatches(row.org_id, req, res)) return;
      res.json(row);
    } catch (err) { next(err); }
  }

  async function create(req, res, next) {
    try {
      const payload = req.body || {};
      for (const f of requiredFields) if (payload[f] === undefined) return res.status(400).json({ error: `${f} required` });

      if (slugUnique && payload.slug) {
        const ex = await db.query(`SELECT id FROM ${table} WHERE slug = $1 AND org_id = $2`, [payload.slug, req.orgid]);
        if (ex.rows.length) return res.status(409).json({ error: 'slug already exists' });
      }

      const cols = ['org_id', 'created_by', 'created_at', 'updated_at'].concat(Object.keys(payload));
      // remove duplicates
      const uniqueCols = [...new Set(cols)];
      const values = [req.orgid, req.user ? req.user.user_id : null, new Date(), new Date()].concat(Object.values(payload));
      const placeholders = uniqueCols.map((_, i) => `$${i+1}`).join(', ');
      const insertCols = uniqueCols.join(', ');
      const sql = `INSERT INTO ${table} (${insertCols}) VALUES (${placeholders}) RETURNING *`;
      const result = await db.query(sql, values);
      const created = result.rows[0];
      try { realtime.emit(`${table}:created`, created); } catch (e) {}
      res.status(201).json(created);
    } catch (err) { next(err); }
  }

  async function update(req, res, next) {
    try {
      const id = req.params.id;
      const getRes = await db.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
      const row = getRes.rows[0];
      if (!row) return res.status(404).json({ error: 'not found' });
      if (!ensureOrgMatches(row.org_id, req, res)) return;

      const payload = req.body || {};
      if (slugUnique && payload.slug) {
        const ex = await db.query(`SELECT id FROM ${table} WHERE slug = $1 AND org_id = $2 AND id != $3`, [payload.slug, req.orgid, id]);
        if (ex.rows.length) return res.status(409).json({ error: 'slug already exists' });
      }

      const setClauses = Object.keys(payload).map((k, i) => `${k}=$${i+1}`).join(', ');
      const values = Object.values(payload);
      const sql = `UPDATE ${table} SET ${setClauses}, updated_at = $${values.length+1} WHERE id = $${values.length+2} RETURNING *`;
      values.push(new Date(), id);
      const result = await db.query(sql, values);
      const updated = result.rows[0];
      try { realtime.emit(`${table}:updated`, updated); } catch (e) {}
      res.json(updated);
    } catch (err) { next(err); }
  }

  async function remove(req, res, next) {
    try {
      const id = req.params.id;
      const getRes = await db.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
      const row = getRes.rows[0];
      if (!row) return res.status(404).json({ error: 'not found' });
      if (!ensureOrgMatches(row.org_id, req, res)) return;
      await db.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
      try { realtime.emit(`${table}:deleted`, { id, org_id: row.org_id }); } catch (e) {}
      res.status(204).send();
    } catch (err) { next(err); }
  }

  return { list, get, create, update, remove };
}

module.exports = resourceFactory;
