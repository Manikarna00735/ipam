const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireOrg } = require('../middleware/org');
const devices = require('../controllers/devicesController');

router.use(requireAuth);
router.use(requireOrg);

router.post('/', devices.createDevices);
router.get('/', devices.listDevices);
router.get('/:id', devices.getDevice);
router.put('/:id', devices.updateDevice);
router.delete('/:id', devices.deleteDevice);
module.exports = router;
