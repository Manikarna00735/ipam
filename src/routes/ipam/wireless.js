const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { requireOrg } = require('../../middleware/org');
const wireless = require('../../controllers/ipam/wirelessController');
const { validate } = require('../../middleware/validate');
const schema = require('../../schemas/ipam');

router.use(requireAuth);
router.use(requireOrg);

router.post('/',    validate(schema.wirelessCreate), wireless.createWireless);
router.get('/', wireless.listWireless);
router.get('/:id', wireless.getWireless);
router.put('/:id', validate(schema.wirelessUpdate), wireless.updateWireless);
router.delete('/:id', wireless.deleteWireless);

module.exports = router;
