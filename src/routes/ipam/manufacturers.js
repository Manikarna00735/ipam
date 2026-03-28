const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { requireOrg } = require('../../middleware/org');
const manufacturers = require('../../controllers/ipam/manufacturersController');
const { validate } = require('../../middleware/validate');
const schema = require('../../schemas/ipam');

router.use(requireAuth);
router.use(requireOrg);

router.post('/',    validate(schema.manufacturerCreate), manufacturers.createManufacturers);
router.get('/', manufacturers.listManufacturers);
router.get('/:id', manufacturers.getManufacturer);
router.put('/:id', validate(schema.manufacturerUpdate), manufacturers.updateManufacturer);
router.delete('/:id', manufacturers.deleteManufacturer);

module.exports = router;
