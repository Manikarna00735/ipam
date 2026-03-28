const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { requireOrg } = require('../../middleware/org');
const vlans = require('../../controllers/ipam/vlansController');
const { validate } = require('../../middleware/validate');
const schema = require('../../schemas/ipam');

router.use(requireAuth);
router.use(requireOrg);

router.post('/',    validate(schema.vlanCreate), vlans.createVlans);
router.get('/',    vlans.listVlans);
router.get('/:id', vlans.getVlan);
router.put('/:id', validate(schema.vlanUpdate), vlans.updateVlan);
router.delete('/:id', vlans.deleteVlan);

module.exports = router;
