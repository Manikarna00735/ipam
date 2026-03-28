const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { requireOrg } = require('../../middleware/org');
const devices = require('../../controllers/ipam/devicesController');
const { validate } = require('../../middleware/validate');
const schema = require('../../schemas/ipam');

router.use(requireAuth);
router.use(requireOrg);

router.post('/',    validate(schema.deviceCreate), devices.createDevices);
router.get('/', devices.listDevices);
router.get('/:id', devices.getDevice);
router.put('/:id', validate(schema.deviceUpdate), devices.updateDevice);
router.delete('/:id', devices.deleteDevice);

module.exports = router;
