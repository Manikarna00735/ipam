const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireOrg } = require('../middleware/org');
const racks = require('../controllers/racksController');

router.use(requireAuth);
router.use(requireOrg);

router.post('/', racks.createRacks);
router.get('/', racks.listRacks);
router.get('/:id', racks.getRack);
router.put('/:id', racks.updateRack);
router.delete('/:id', racks.deleteRack);
module.exports = router;
