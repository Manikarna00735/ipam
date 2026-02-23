const db = require('../../db');
const { getOrgDetails, getUserDetails } = require('../../utils/firebase');

/**
 * Write a single activity log event
 * POST /api/activity-logs
 */
async function createActivityLog(req, res, next) {
  try {
    const payload = req.body || {};

    // Validate required fields
    if (!payload.module || !payload.category || !payload.event_type || !payload.event_label) {
      return res.status(400).json({
        error: 'Missing required fields: module, category, event_type, event_label'
      });
    }

    // Validate enum values
    const validModules = ['core', 'alerts', 'ams', 'ipam', 'system'];
    const validCategories = ['security', 'governance', 'operational', 'config', 'automation', 'billing'];
    const validSeverities = ['info', 'warning', 'critical'];
    const validOutcomes = ['success', 'failed', 'denied', 'partial', 'pending'];
    const validActorTypes = ['user', 'service_account', 'integration', 'system'];

    if (!validModules.includes(payload.module)) {
      return res.status(400).json({ error: `Invalid module: ${payload.module}` });
    }
    if (!validCategories.includes(payload.category)) {
      return res.status(400).json({ error: `Invalid category: ${payload.category}` });
    }
    if (payload.severity && !validSeverities.includes(payload.severity)) {
      return res.status(400).json({ error: `Invalid severity: ${payload.severity}` });
    }
    if (payload.outcome && !validOutcomes.includes(payload.outcome)) {
      return res.status(400).json({ error: `Invalid outcome: ${payload.outcome}` });
    }
    if (payload.actor_type && !validActorTypes.includes(payload.actor_type)) {
      return res.status(400).json({ error: `Invalid actor_type: ${payload.actor_type}` });
    }

    // Get org name from Firestore
    const orgUuid = req.orgid;
    let orgName = 'unknown';
    if (orgUuid) {
      const orgDetails = await getOrgDetails(orgUuid);
      if (orgDetails && orgDetails.name) {
        orgName = orgDetails.name;
      }
    }

    // Get actor display name from Firestore user details
    const actorId = payload.actor_id || req.user?.user_id || 'system';
    let actorDisplay = payload.actor_display;
    
    if (!actorDisplay && actorId !== 'system') {
      const userDetails = await getUserDetails(actorId);
      if (userDetails && userDetails.fullName) {
        actorDisplay = userDetails.fullName;      
    } else if (userDetails && userDetails.name) {
        actorDisplay = userDetails.name;      
    } else if (userDetails && userDetails.email) {
        actorDisplay = userDetails.email;
      }
    }
    
    // Fallback for actor display
    if (!actorDisplay) {
      actorDisplay = req.user?.user_id || 'System';
    }

    const sql = `INSERT INTO activity_logs (
      orgid, org_name,
      module, category, severity, outcome,
      actor_type, actor_id, actor_display,
      event_type, event_label,
      target_type, target_id, target_display,
      source, ip_address, user_agent,
      request_id, correlation_id,
      metadata, changes
    ) VALUES (
      $1, $2,
      $3, $4, $5, $6,
      $7, $8, $9,
      $10, $11,
      $12, $13, $14,
      $15, $16, $17,
      $18, $19,
      $20, $21
    ) RETURNING event_id, timestamp`;

    const values = [
      orgUuid,
      orgName,
      payload.module,
      payload.category,
      payload.severity || 'info',
      payload.outcome || 'success',
      payload.actor_type || 'user',
      actorId,
      actorDisplay,
      payload.event_type,
      payload.event_label,
      payload.target_type || null,
      payload.target_id || null,
      payload.target_display || null,
      payload.source || null,
      payload.ip_address || req.ip || null,
      payload.user_agent || req.headers['user-agent'] || null,
      payload.request_id || null,
      payload.correlation_id || null,
      payload.metadata ? JSON.stringify(payload.metadata) : null,
      payload.changes ? JSON.stringify(payload.changes) : null
    ];

    const result = await db.query(sql, values);

    return res.status(201).json({
      event_id: result.rows[0].event_id,
      timestamp: result.rows[0].timestamp
    });

  } catch (err) {
    next(err);
  }
}

/**
 * Query activity logs with filters
 * POST /api/activity-logs/query
 */
async function queryActivityLogs(req, res, next) {
  try {
    const {
      page = 1,
      page_size = 50,
      from,
      to,
      module,
      categories,
      severities,
      actor_type,
      actor_search,
      event_types,
      target_type,
      target_search,
      outcome,
      source,
      correlation_id,
      ip_address,
      user_agent
    } = req.body;

    if (!req.orgid) {
      return res.status(400).json({ error: 'Missing organization context' });
    }

    // Clamp page_size
    const safePageSize = Math.min(Math.max(page_size || 50, 1), 100);
    const offset = (Math.max(page, 1) - 1) * safePageSize;

    // Build dynamic WHERE clause
    const conditions = ['orgid = $1'];
    const params = [req.orgid];
    let paramIdx = 2;

    if (from) {
      conditions.push(`timestamp >= $${paramIdx}`);
      params.push(from);
      paramIdx++;
    }
    if (to) {
      conditions.push(`timestamp <= $${paramIdx}`);
      params.push(to);
      paramIdx++;
    }

    if (module) {
      conditions.push(`module = $${paramIdx}`);
      params.push(module);
      paramIdx++;
    }
    if (categories && categories.length > 0) {
      conditions.push(`category = ANY($${paramIdx})`);
      params.push(categories);
      paramIdx++;
    }
    if (severities && severities.length > 0) {
      conditions.push(`severity = ANY($${paramIdx})`);
      params.push(severities);
      paramIdx++;
    }
    if (actor_type) {
      conditions.push(`actor_type = $${paramIdx}`);
      params.push(actor_type);
      paramIdx++;
    }
    if (actor_search) {
      conditions.push(
        `(actor_display ILIKE $${paramIdx} OR actor_id ILIKE $${paramIdx})`
      );
      params.push(`%${actor_search}%`);
      paramIdx++;
    }
    if (event_types && event_types.length > 0) {
      conditions.push(`event_type = ANY($${paramIdx})`);
      params.push(event_types);
      paramIdx++;
    }
    if (target_type) {
      conditions.push(`target_type = $${paramIdx}`);
      params.push(target_type);
      paramIdx++;
    }
    if (target_search) {
      conditions.push(
        `(target_display ILIKE $${paramIdx} OR target_id ILIKE $${paramIdx} OR actor_display ILIKE $${paramIdx})`
      );
      params.push(`%${target_search}%`);
      paramIdx++;
    }
    if (outcome) {
      conditions.push(`outcome = $${paramIdx}`);
      params.push(outcome);
      paramIdx++;
    }
    if (source) {
      conditions.push(`source = $${paramIdx}`);
      params.push(source);
      paramIdx++;
    }
    if (correlation_id) {
      conditions.push(
        `(correlation_id ILIKE $${paramIdx} OR request_id ILIKE $${paramIdx})`
      );
      params.push(`%${correlation_id}%`);
      paramIdx++;
    }
    if (ip_address) {
      conditions.push(`ip_address::text ILIKE $${paramIdx}`);
      params.push(`%${ip_address}%`);
      paramIdx++;
    }
    if (user_agent) {
      conditions.push(`user_agent ILIKE $${paramIdx}`);
      params.push(`%${user_agent}%`);
      paramIdx++;
    }

    const whereClause = conditions.join(' AND ');

    // Count total
    const countResult = await db.query(
      `SELECT COUNT(*) AS total FROM activity_logs WHERE ${whereClause}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].total, 10);

    // Fetch page
    const dataQuery = `
      SELECT
        event_id, timestamp, orgid,
        module, category, severity, outcome,
        actor_type, actor_id, actor_display,
        event_type, event_label,
        target_type, target_id, target_display,
        source, ip_address::text as ip_address, user_agent,
        request_id, correlation_id,
        metadata, changes, created_at
      FROM activity_logs
      WHERE ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;
    params.push(safePageSize, offset);

    const dataResult = await db.query(dataQuery, params);

    return res.status(200).json({
      items: dataResult.rows,
      total_count: totalCount,
      page: Math.max(page, 1),
      page_size: safePageSize
    });

  } catch (err) {
    next(err);
  }
}

// ⚠️ DISABLED: This endpoint is commented out (redundant with POST /query).
// Uncomment to re-enable.

// /**
//  * Get a single activity log by event_id
//  * GET /api/activity-logs/:event_id
//  */
// async function getActivityLog(req, res, next) {
//   try {
//     const { event_id } = req.params;
//
//     if (!req.orgid) {
//       return res.status(400).json({ error: 'Missing organization context' });
//     }
//
//     const result = await db.query(
//       `SELECT * FROM activity_logs WHERE event_id = $1 AND orgid = $2`,
//       [event_id, req.orgid]
//     );
//
//     if (result.rows.length === 0) {
//       return res.status(404).json({ error: 'Activity log not found' });
//     }
//
//     res.json(result.rows[0]);
//   } catch (err) {
//     next(err);
//   }
// }

// ⚠️ DISABLED: This endpoint is commented out (redundant with POST /query).
// Use POST /query instead for paginated listing with optional filters.
// Uncomment to re-enable.

// /**
//  * List activity logs (paginated, with optional filters)
//  * GET /api/activity-logs
//  */
// async function listActivityLogs(req, res, next) {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const page_size = Math.min(parseInt(req.query.page_size) || 50, 100);
//
//     if (!req.orgid) {
//       return res.status(400).json({ error: 'Missing organization context' });
//     }
//
//     const offset = (Math.max(page, 1) - 1) * page_size;
//
//     const countResult = await db.query(
//       `SELECT COUNT(*) AS total FROM activity_logs WHERE orgid = $1`,
//       [req.orgid]
//     );
//     const totalCount = parseInt(countResult.rows[0].total, 10);
//
//     const result = await db.query(
//       `SELECT 
//         event_id, timestamp, orgid,
//         module, category, severity, outcome,
//         actor_type, actor_id, actor_display,
//         event_type, event_label,
//         target_type, target_id, target_display,
//         source, ip_address::text as ip_address, user_agent,
//         request_id, correlation_id,
//         metadata, changes, created_at
//       FROM activity_logs 
//       WHERE orgid = $1 
//       ORDER BY timestamp DESC 
//       LIMIT $2 OFFSET $3`,
//       [req.orgid, page_size, offset]
//     );
//
//     res.json({
//       items: result.rows,
//       total_count: totalCount,
//       page: Math.max(page, 1),
//       page_size: page_size
//     });
//   } catch (err) {
//     next(err);
//   }
// }

module.exports = {
  createActivityLog,
  queryActivityLogs,
  // getActivityLog,         // ⚠️ DISABLED: Commented out (redundant with POST /query)
  // listActivityLogs        // ⚠️ DISABLED: Commented out (redundant with POST /query)
};
