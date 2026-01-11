const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireOrg } = require('../middleware/org');
const platforms = require('../controllers/platformsController');
const { requireFieldsTypes } = require('../middleware/validators');

router.use(requireAuth);
router.use(requireOrg);

router.post('/', requireFieldsTypes({ name: 'string', slug: 'string' }), platforms.createPlatforms);
router.get('/', platforms.listPlatforms);
router.get('/:id', platforms.getPlatform);
router.put('/:id', platforms.updatePlatform);
router.delete('/:id', platforms.deletePlatform);
module.exports = router;
