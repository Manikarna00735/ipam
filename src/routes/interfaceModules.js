const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireOrg } = require('../middleware/org');
const interfaceModules = require('../controllers/interfaceModulesController');
const { requireFieldsTypes } = require('../middleware/validators');

router.use(requireAuth);
router.use(requireOrg);

router.post('/', requireFieldsTypes({ name: 'string', slug: 'string' }), interfaceModules.createInterfaceModules);
router.get('/', interfaceModules.listInterfaceModules);
router.get('/:id', interfaceModules.getInterfaceModule);
router.put('/:id', interfaceModules.updateInterfaceModule);
router.delete('/:id', interfaceModules.deleteInterfaceModule);
module.exports = router;
