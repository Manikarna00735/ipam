const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireOrg } = require('../middleware/org');
const vrfs = require('../controllers/vrfsController');
const { requireFieldsTypes } = require('../middleware/validators');

router.use(requireAuth);
router.use(requireOrg);

router.post('/', requireFieldsTypes({ name: 'string' }), vrfs.createVrfs);
router.get('/', vrfs.listVrfs);
router.get('/:id', vrfs.getVrf);
router.put('/:id', vrfs.updateVrf);
router.delete('/:id', vrfs.deleteVrf);
module.exports = router;
