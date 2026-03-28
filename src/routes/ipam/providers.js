const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { requireOrg } = require('../../middleware/org');
const providers = require('../../controllers/ipam/providersController');
const { validate } = require('../../middleware/validate');
const schema = require('../../schemas/ipam');

router.use(requireAuth);
router.use(requireOrg);

router.post('/',    validate(schema.providerCreate), providers.createProviders);
router.get('/', providers.listProviders);
router.get('/:id', providers.getProvider);
router.put('/:id', validate(schema.providerUpdate), providers.updateProvider);
router.delete('/:id', providers.deleteProvider);

module.exports = router;
