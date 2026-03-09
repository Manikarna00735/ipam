const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { requireOrg } = require('../../middleware/org');
const dashboard = require('../../controllers/ipam/dashboardController');

router.use(requireAuth);
router.use(requireOrg);

router.get('/summary', dashboard.getSummary);

module.exports = router;
