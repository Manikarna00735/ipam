const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireOrg } = require('../middleware/org');
const interfaces = require('../controllers/interfacesController');
const { requireFieldsTypes } = require('../middleware/validators');

router.use(requireAuth);
router.use(requireOrg);

router.post('/', requireFieldsTypes({ name: 'string', device_uuid: 'uuid', type: 'string' }), interfaces.createInterfaces);
router.get('/', interfaces.listInterfaces);
router.get('/:id', interfaces.getInterface);
router.put('/:id', interfaces.updateInterface);
router.delete('/:id', interfaces.deleteInterface);
module.exports = router;
