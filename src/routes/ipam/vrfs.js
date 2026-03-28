const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { requireOrg } = require('../../middleware/org');
const vrfs = require('../../controllers/ipam/vrfsController');
const { validate } = require('../../middleware/validate');
const schema = require('../../schemas/ipam');

router.use(requireAuth);
router.use(requireOrg);

router.post('/',    validate(schema.vrfCreate), vrfs.createVrfs);
router.get('/', vrfs.listVrfs);
router.get('/:id', vrfs.getVrf);
router.put('/:id', validate(schema.vrfUpdate), vrfs.updateVrf);
router.delete('/:id', vrfs.deleteVrf);

module.exports = router;
