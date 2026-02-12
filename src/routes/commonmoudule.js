const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireOrg } = require('../middleware/org');
const devices = require('../controllers/devicesController');
const { requireFieldsTypes } = require('../middleware/validators');

router.use(requireAuth);
router.use(requireOrg);


router.put('/rack',
    requireFieldsTypes({uuid: 'uuid'}),
    devices.updateDeviceRack);
module.exports = router;
