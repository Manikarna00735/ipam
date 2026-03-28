const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { requireOrg } = require('../../middleware/org');
const regions = require('../../controllers/ipam/regionsController');
const { validate } = require('../../middleware/validate');
const schema = require('../../schemas/ipam');

router.use(requireAuth);
router.use(requireOrg);


router.post('/',    validate(schema.regionCreate), regions.createRegions);
router.get('/', regions.listRegions);
router.get('/:id', regions.getRegion);
router.put('/:id', validate(schema.regionUpdate), regions.updateRegion);
router.delete('/:id', regions.deleteRegion);

module.exports = router;
