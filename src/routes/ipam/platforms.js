const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { requireOrg } = require('../../middleware/org');
const platforms = require('../../controllers/ipam/platformsController');
const { validate } = require('../../middleware/validate');
const schema = require('../../schemas/ipam');

router.use(requireAuth);
router.use(requireOrg);

router.post('/',    validate(schema.platformCreate), platforms.createPlatforms);
router.get('/', platforms.listPlatforms);
router.get('/:id', platforms.getPlatform);
router.put('/:id', validate(schema.platformUpdate), platforms.updatePlatform);
router.delete('/:id', platforms.deletePlatform);

module.exports = router;
