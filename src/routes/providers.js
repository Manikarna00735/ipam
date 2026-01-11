const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireOrg } = require('../middleware/org');
const providers = require('../controllers/providersController');
const { requireFieldsTypes } = require('../middleware/validators');

router.use(requireAuth);
router.use(requireOrg);

router.post('/', requireFieldsTypes({ name: 'string', slug: 'string' }), providers.createProviders);
router.get('/', providers.listProviders);
router.get('/:id', providers.getProvider);
router.put('/:id', providers.updateProvider);
router.delete('/:id', providers.deleteProvider);
module.exports = router;