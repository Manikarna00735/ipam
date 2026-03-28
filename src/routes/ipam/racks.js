const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { requireOrg } = require('../../middleware/org');
const racks = require('../../controllers/ipam/racksController');
const { validate } = require('../../middleware/validate');
const schema = require('../../schemas/ipam');

router.use(requireAuth);
router.use(requireOrg);

router.post('/',    validate(schema.rackCreate), racks.createRacks);
router.get('/', racks.listRacks);
router.get('/:id', racks.getRack);
router.put('/:id', validate(schema.rackUpdate), racks.updateRack);
router.delete('/:id', racks.deleteRack);

module.exports = router;
