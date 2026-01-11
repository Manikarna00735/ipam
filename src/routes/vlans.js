const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireOrg } = require('../middleware/org');
const vlans = require('../controllers/vlansController');

router.use(requireAuth);
router.use(requireOrg);

router.post('/', vlans.createVlans);
router.get('/', vlans.listVlans);
router.get('/:id', vlans.getVlan);
router.put('/:id', vlans.updateVlan);
router.delete('/:id', vlans.deleteVlan);
module.exports = router;
