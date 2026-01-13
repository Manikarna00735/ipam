const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireOrg } = require('../middleware/org');
const wireless = require('../controllers/wirelessController');
const { requireFieldsTypes } = require('../middleware/validators');

router.use(requireAuth);
router.use(requireOrg);

router.post('/', requireFieldsTypes({ ssid: 'string', status: 'string' }), wireless.createWireless);
router.get('/', wireless.listWireless);
router.get('/:id', wireless.getWireless);
router.put('/:id', wireless.updateWireless);
router.delete('/:id', wireless.deleteWireless);
module.exports = router;
