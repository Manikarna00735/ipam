const db = require('../db');
const { getOrgDetails, getUserDetails } = require('./firebase');

/**
 * Safely extract target display value with fallbacks.
 * Handles cases where display fields might be null or undefined.
 * @param {Object} record - The database record
 * @param {string} targetType - Type of target (for fallback context)
 * @returns {string|null} Display value or null if record is falsy
 */
function getTargetDisplay(record, targetType) {
  if (!record) return null;
  
  // Try common display field names in order of preference
  const displayFields = {
    device: ['name'],
    rack: ['name'],
    vrf: ['name'],
    vlan: ['name'],
    site: ['name'],
    region: ['name'],
    location: ['name'],
    platform: ['name'],
    manufacturer: ['name'],
    provider: ['name'],
    interface: ['name'],
    circuit: ['ordernumber', 'description'],
    wireless: ['ssid'],
    contract: ['contract_name'],
    vendor: ['name'],
    purchase_order: ['po_id'],
    prefix: ['prefix'],
    subnet: ['subnet'],
    ip: ['ip']
  };
  
  const fieldsToTry = displayFields[targetType] || ['name', 'uuid'];
  
  for (const field of fieldsToTry) {
    const value = record[field];
    if (value !== null && value !== undefined && value !== '') {
      return String(value);
    }
  }
  
  // Final fallback: use UUID if available
  if (record.uuid) return record.uuid;
  if (record.id) return record.id;
  
  return null;
}

/**
 * Write an activity log event.
 * Failures are silently caught — logging should never break the main flow.
 * 
 * Usage in controllers:
 *   const { logActivity } = require('../utils/activityLogger');
 *   await logActivity({
 *     module: 'ipam',
 *     category: 'config',
 *     event_type: 'VRF_CREATED',
 *     event_label: 'VRF Created',
 *     actor_id: req.user?.user_id,
 *     target_type: 'vrf',
 *     target_id: vrf.uuid,
 *     target_display: vrf.name
 *   }, req);
 *
 * @param {Object} event - Event object with required and optional fields
 * @param {string} event.module         - Required: core | alerts | ams | ipam | system
 * @param {string} event.category       - Required: security | governance | operational | config | automation | billing
 * @param {string} event.event_type     - Required: e.g. ASSET_CREATED
 * @param {string} event.event_label    - Required: e.g. "Asset Created"
 * @param {string} [event.actor_id]     - Default: req.user?.user_id or 'system'
 * @param {string} [event.actor_display] - Default: req.user?.user_id or 'System'
 * @param {string} [event.severity]     - Default: 'info'
 * @param {string} [event.outcome]      - Default: 'success'
 * @param {string} [event.actor_type]   - Default: 'user'
 * @param {string} [event.target_type]  - Optional
 * @param {string} [event.target_id]    - Optional
 * @param {string} [event.target_display] - Optional
 * @param {string} [event.source]       - Default: 'api'
 * @param {Object} [event.metadata]     - Optional: arbitrary event data
 * @param {Object} [event.changes]      - Optional: { old: {...}, new: {...} }
 * @param {Object} req - Express request object (for orgid, user, ip, user-agent)
 */
async function logActivity(event, req) {
  try {
    // Validate required fields
    if (!event.module || !event.category || !event.event_type || !event.event_label) {
      throw new Error('Missing required fields: module, category, event_type, event_label');
    }

    // Validate enum values
    const validModules = ['core', 'alerts', 'ams', 'ipam', 'system'];
    const validCategories = ['security', 'governance', 'operational', 'config', 'automation', 'billing'];
    const validSeverities = ['info', 'warning', 'critical'];
    const validOutcomes = ['success', 'failed', 'denied', 'partial', 'pending'];
    const validActorTypes = ['user', 'service_account', 'integration', 'system'];

    if (!validModules.includes(event.module)) {
      throw new Error(`Invalid module: ${event.module}`);
    }
    if (!validCategories.includes(event.category)) {
      throw new Error(`Invalid category: ${event.category}`);
    }
    if (event.severity && !validSeverities.includes(event.severity)) {
      throw new Error(`Invalid severity: ${event.severity}`);
    }
    if (event.outcome && !validOutcomes.includes(event.outcome)) {
      throw new Error(`Invalid outcome: ${event.outcome}`);
    }
    if (event.actor_type && !validActorTypes.includes(event.actor_type)) {
      throw new Error(`Invalid actor_type: ${event.actor_type}`);
    }

    // Get org name from Firestore
    const orgUuid = req?.orgid || 'unknown';
    let orgName = 'unknown';
    if (orgUuid !== 'unknown') {
      const orgDetails = await getOrgDetails(orgUuid);
      if (orgDetails && orgDetails.name) {
        orgName = orgDetails.name;
      }
    }

    // Get actor display name from Firestore user details
    const actorId = event.actor_id || req?.user?.user_id || 'system';
    let actorDisplay = event.actor_display;
    
    if (!actorDisplay && actorId !== 'system') {
      const userDetails = await getUserDetails(actorId);
      if (userDetails && userDetails.name) {
        actorDisplay = userDetails.name;
      } else if (userDetails && userDetails.fullName) {
        actorDisplay = userDetails.fullName;
      } else if (userDetails && userDetails.email) {
        actorDisplay = userDetails.email;
      }
    }
    
    // Fallback for actor display
    if (!actorDisplay) {
      actorDisplay = req?.user?.user_id || 'System';
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
    )`;

    const values = [
      orgUuid,
      orgName,
      event.module,
      event.category,
      event.severity || 'info',
      event.outcome || 'success',
      event.actor_type || 'user',
      actorId,
      actorDisplay,
      event.event_type,
      event.event_label,
      event.target_type || null,
      event.target_id || null,
      event.target_display || null,
      event.source || 'api',
      event.ip_address || req?.ip || null,
      event.user_agent || req?.headers?.['user-agent'] || null,
      event.request_id || null,
      event.correlation_id || null,
      event.metadata ? JSON.stringify(event.metadata) : null,
      event.changes ? JSON.stringify(event.changes) : null
    ];

    await db.query(sql, values);
  } catch (err) {
    // Log failures should never break the main operation
    console.error('[ActivityLog] Failed to write log:', err.message);
  }
}

module.exports = { logActivity, getTargetDisplay };
