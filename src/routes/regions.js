const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireOrg } = require('../middleware/org');
const regions = require('../controllers/regionsController');

router.use(requireAuth);
router.use(requireOrg);


router.post('/', regions.createRegions);
router.get('/', regions.listRegions);
router.get('/:id', regions.getRegion);
router.put('/:id', regions.updateRegion);
router.delete('/:id', regions.deleteRegion);
module.exports = router;