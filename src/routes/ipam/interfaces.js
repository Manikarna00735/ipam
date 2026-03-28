const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { requireOrg } = require('../../middleware/org');
const interfaces = require('../../controllers/ipam/interfacesController');
const { validate } = require('../../middleware/validate');
const schema = require('../../schemas/ipam');

router.use(requireAuth);
router.use(requireOrg);

router.post('/',    validate(schema.interfaceCreate), interfaces.createInterfaces);
router.get('/', interfaces.listInterfaces);
router.get('/:id', interfaces.getInterface);
router.put('/:id', validate(schema.interfaceUpdate), interfaces.updateInterface);
router.delete('/:id', interfaces.deleteInterface);

module.exports = router;
