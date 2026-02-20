# Activity Logs Module - Implementation Guide

## Overview
The Activity Logs module is a new, non-breaking addition to the IPAM API that tracks all user actions and system events in an audit trail. This module follows the existing IPAM architecture patterns and does not affect any existing functionality.

## Module Structure

```
src/
├── controllers/
│   ├── activity_logs/
│   │   └── activityLogsController.js      ✅ Query and write endpoints
│   ├── assets/
│   ├── [other controllers...]
│   
├── routes/
│   ├── activity_logs/
│   │   └── index.js                       ✅ Route definitions
│   ├── assets/
│   ├── [other routes...]
│   
├── utils/
│   └── activityLogger.js                  ✅ Reusable log helper
│
├── index.js                               ✅ Registers activity-logs routes
└── [other files...]

migrations/
└── 001_init.sql                            ✅ activity_logs table with orgid
```

## API Endpoints

### Write Activity Log (POST)
```
POST /api/activity-logs
```
Write a single log event. Requires X-Org-Id header (like other IPAM endpoints).

**Request:**
```json
{
  "module": "ipam",
  "category": "config",
  "event_type": "VRF_CREATED",
  "event_label": "VRF Created",
  "target_type": "vrf",
  "target_id": "vrf_prod_001",
  "target_display": "Production VRF",
  "source": "api",
  "severity": "info",
  "outcome": "success"
}
```

**Response (201 Created):**
```json
{
  "event_id": "evt_abc123...",
  "timestamp": "2026-02-19T10:30:00Z"
}
```

### Query Activity Logs (POST)
```
POST /api/activity-logs/query
```
Query logs with multiple filters, supports pagination. Requires X-Org-Id header.

**Request:**
```json
{
  "page": 1,
  "page_size": 50,
  "from": "2026-02-01T00:00:00Z",
  "to": "2026-02-19T23:59:59Z",
  "module": "ipam",
  "categories": ["security", "governance"],
  "severities": ["warning", "critical"],
  "event_types": ["VRF_CREATED", "VRF_DELETED"]
}
```

**Response (200 OK):**
```json
{
  "items": [
    {
      "event_id": "evt_abc123",
      "timestamp": "2026-02-19T10:30:00Z",
      "orgid": "org_alpha",
      "module": "ipam",
      "category": "config",
      "event_type": "VRF_CREATED",
      "event_label": "VRF Created",
      "actor_id": "usr_001",
      "actor_display": "usr_001",
      "target_type": "vrf",
      "target_id": "vrf_prod_001",
      "target_display": "Production VRF",
      "outcome": "success",
      "severity": "info",
      "source": "api",
      "ip_address": "192.168.1.100",
      "metadata": null,
      "changes": null
    }
  ],
  "total_count": 245,
  "page": 1,
  "page_size": 50
}
```

### List Activity Logs (GET) [DISABLED]
```
GET /api/activity-logs?page=1&page_size=50
```
⚠️ **DISABLED as of Feb 20, 2026** - This endpoint is redundant with `POST /api/activity-logs/query`
which handles paginated listing with optional filters. To re-enable, uncomment the route and controller function.

### Get Single Activity Log (GET) [DISABLED]
```
GET /api/activity-logs/:event_id
```
⚠️ **DISABLED as of Feb 20, 2026** - This endpoint is redundant with `POST /api/activity-logs/query`
which can retrieve logs by event_id. To re-enable, uncomment the route and controller function.

---

## Using the Activity Logger Helper

The `logActivity` helper function makes it easy to add logging to any existing IPAM/AMS module. **It is safe** — any failures are caught and logged silently, never breaking the main operation.

### Basic Usage

Import the helper in your controller:
```javascript
const { logActivity } = require('../utils/activityLogger');
```

Call it AFTER a successful operation, passing the event object and the request:
```javascript
// After successful VRF creation
await logActivity({
  module: 'ipam',
  category: 'config',
  event_type: 'VRF_CREATED',
  event_label: 'VRF Created',
  target_type: 'vrf',
  target_id: newVrf.uuid,
  target_display: newVrf.name,
  source: 'api'
}, req);
```

The helper automatically uses:
- `req.orgid` — from the org middleware (X-Org-Id header)
- `req.user?.user_id` — actor ID (from JWT token)
- `req.ip` — client IP address
- `req.headers['user-agent']` — browser/client info

### Example: Integrate with VRF Controller

In `src/controllers/vrfsController.js`, add logging to the `createVrfs` function:

```javascript
const db = require('../db');
const { logActivity } = require('../utils/activityLogger'); // ADD THIS

async function createVrfs(req, res, next) {
  try {
    const payload = req.body || {};
    const sql = `INSERT INTO vrfs (name, description, tag, tenant, importtarget,
     exporttarget, orgid, comments, updatedat, user_id) 
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,current_timestamp,$9) RETURNING *`;
    const values = [payload.name, payload?.description || null,
      payload?.tag || payload?.tagscsv || null, payload?.tenant || null, 
      payload?.importtarget || null, payload?.exporttarget || null,
      req.orgid, payload?.comments || null, req.user ? req.user.user_id : null];
    const result = await db.query(sql, values);
    
    // ADD THIS LOGGING BLOCK
    await logActivity({
      module: 'ipam',
      category: 'config',
      event_type: 'VRF_CREATED',
      event_label: 'VRF Created',
      target_type: 'vrf',
      target_id: result.rows[0].uuid,
      target_display: result.rows[0].name,
      source: 'api'
    }, req);
    
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
}
```

### Example: Update with Diff Tracking

For UPDATE operations, capture the old and new values:

```javascript
const { logActivity } = require('../utils/activityLogger');

async function updateVrf(req, res, next) {
  try {
    const id = req.params.id;
    const payload = req.body || {};
    
    // Fetch the old record BEFORE updating
    const getRes = await db.query('SELECT * FROM vrfs WHERE uuid = $1', [id]);
    const oldRow = getRes.rows[0];
    if (!oldRow) return res.status(404).json({ error: 'not found' });
    
    // ... update logic ...
    const updatedRow = result.rows[0];
    
    // Log with changes diff
    await logActivity({
      module: 'ipam',
      category: 'config',
      event_type: 'VRF_UPDATED',
      event_label: 'VRF Updated',
      target_type: 'vrf',
      target_id: updatedRow.uuid,
      target_display: updatedRow.name,
      source: 'api',
      changes: {
        old: { name: oldRow.name, description: oldRow.description },
        new: { name: updatedRow.name, description: updatedRow.description }
      }
    }, req);
    
    res.json(updatedRow);
  } catch (err) { next(err); }
}
```

### Example: Failed Operation

Log failures with `severity: 'warning'` and `outcome: 'failed'`:

```javascript
await logActivity({
  module: 'ipam',
  category: 'config',
  event_type: 'VRF_CREATION_FAILED',
  event_label: 'VRF Creation Failed',
  severity: 'warning',
  outcome: 'failed',
  source: 'api',
  metadata: { error: err.message }
}, req);
```

---

## Event Type Taxonomy

### Modules
- `core` — Authentication, org, user management
- `ipam` — IP Address Management
- `ams` — Asset Management System
- `alerts` — Alerting system
- `system` — System-level events

### Categories
- `security` — Auth, access control, data protection
- `governance` — Compliance, policy, org structure
- `operational` — CRUD operations, workflows
- `config` — Configuration changes
- `automation` — Automated processes, jobs
- `billing` — Billing, costs, usage

### Severities
- `info` — Normal operation
- `warning` — Potential issue
- `critical` — Critical incident

### Outcomes
- `success` — Operation succeeded
- `failed` — Operation failed
- `denied` — Access denied
- `partial` — Partial success
- `pending` — Pending completion

---

## Priority Integration Tasks

Add logging to these modules first (high priority):

### IPAM Module
- [x] VRF: `VRF_CREATED`, `VRF_UPDATED`, `VRF_DELETED`
- [ ] IP: `IP_ALLOCATED`, `IP_RELEASED`, `IP_RESERVED`
- [ ] Sites: `SITE_CREATED`, `SITE_UPDATED`, `SITE_DELETED`
- [ ] Racks: `RACK_CREATED`, `RACK_UPDATED`
- [ ] Devices: `DEVICE_CREATED`, `DEVICE_UPDATED`
- [ ] Providers: `PROVIDER_CREATED`, `PROVIDER_UPDATED`, `PROVIDER_DELETED`
- [ ] Regions: `REGION_CREATED`, `REGION_UPDATED`, `REGION_DELETED`

### AMS Module (Purchase Orders, Contracts, Assets)
- [ ] Asset: `ASSET_CREATED`, `ASSET_UPDATED`, `ASSET_DELETED`
- [ ] PO: `PO_CREATED`, `PO_APPROVED`, `PO_REJECTED`
- [ ] Vendor: `VENDOR_CREATED`, `VENDOR_UPDATED`
- [ ] Contract: `CONTRACT_CREATED`, `CONTRACT_UPDATED`

---

## Database Schema

The `activity_logs` table is **immutable and append-only**:
- Primary key: `event_id` (auto-generated `evt_` + UUID)
- Timestamps: Always UTC (`TIMESTAMPTZ`)
- Organization isolation: Uses `orgid varchar(128)` to match existing IPAM schema (same as other tables)
- Indexes: Optimized for 12 filter dimensions
- Trigger: Prevents UPDATE/DELETE (append-only for audit compliance)

Retention: Optional cleanup job can delete logs older than 365 days (see migrations file for SQL).

---

## Error Handling

**Logging failures never break the main operation.** The `logActivity` helper wraps all inserts in try/catch:

```javascript
try {
  await db.query(sql, values);
} catch (err) {
  // Silently log the error; don't throw
  console.error('[ActivityLog] Failed to write log:', err.message);
}
```

So adding `logActivity` calls to existing endpoints is **100% safe** — if the database is slow or the log table has issues, the main request still completes normally.

---

## Testing

### Test Write Endpoint
```bash
curl -X POST http://localhost:5000/api/activity-logs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "company_id": "comp_001",
    "org_id": "org_alpha",
    "module": "ipam",
    "category": "config",
    "event_type": "TEST_EVENT",
    "event_label": "Test Event",
    "actor_id": "usr_001",
    "actor_display": "Test User"
  }'
```

### Test Query Endpoint
```bash
curl -X POST http://localhost:5000/api/activity-logs/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "page": 1,
    "page_size": 10,
    "company_id": "comp_001"
  }'
```

---

## Notes

- **No breaking changes**: All existing endpoints remain unchanged.
- **Silent failures**: Logging never breaks the main user flow.
- **Flexible metadata**: Use the `metadata` field (JSONB) to capture any custom data.
- **Diff tracking**: Use the `changes` field for before/after comparisons on UPDATE operations.
- **Request tracing**: Use `request_id` and `correlation_id` to group related events.
- **Schema consistency**: Uses `orgid varchar(128)` (same as all other IPAM tables, not company_id)
- **Aligned with existing modules**: Uses same authentication and org context as other IPAM modules
  - Requires `X-Org-Id` header (provided by `requireOrg` middleware)
  - Uses `req.user?.user_id` from JWT token (set by `requireAuth` middleware)
  - Automatically captures `req.ip`, `req.headers['user-agent']` for context
  - Uses `req.orgid` (set by org middleware) as the organization identifier
