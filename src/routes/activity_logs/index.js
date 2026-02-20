const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { requireOrg } = require('../../middleware/org');
const activityLogs = require('../../controllers/activity_logs/activityLogsController');

// All activity log routes require authentication and organization context
router.use(requireAuth);
router.use(requireOrg);

// POST /api/activity-logs — Write a single log event
router.post('/', activityLogs.createActivityLog);

// POST /api/activity-logs/query — Query logs with filters
router.post('/query', activityLogs.queryActivityLogs);

// ⚠️ DISABLED: The following endpoints are commented out. Uncomment if needed.
// They are redundant with POST /query which handles listing, filtering, and getting by correlation_id

// // GET /api/activity-logs — List logs (paginated)
// router.get('/', activityLogs.listActivityLogs);
//
// // GET /api/activity-logs/:event_id — Get single log
// router.get('/:event_id', activityLogs.getActivityLog);

module.exports = router;
