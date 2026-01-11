const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireOrg } = require('../middleware/org');
const platforms = require('../controllers/platformsController');

router.use(requireAuth);
router.use(requireOrg);

router.post('/', platforms.createPlatforms);
router.get('/', platforms.listPlatforms);
router.get('/:id', platforms.getPlatform);
router.put('/:id', platforms.updatePlatform);
router.delete('/:id', platforms.deletePlatform);
module.exports = router;
