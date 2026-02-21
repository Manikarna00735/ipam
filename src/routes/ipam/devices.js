const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { requireOrg } = require('../../middleware/org');
const devices = require('../../controllers/ipam/devicesController');
const { requireFieldsTypes } = require('../../middleware/validators');

router.use(requireAuth);
router.use(requireOrg);

router.post('/', requireFieldsTypes({ name: 'string', devicetype: 'string', role: 'string', site_uuid: 'uuid' }), devices.createDevices);
router.get('/', devices.listDevices);
router.get('/:id', devices.getDevice);
router.put('/:id', devices.updateDevice);
router.delete('/:id', devices.deleteDevice);
module.exports = router;
