const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { requireOrg } = require('../../middleware/org');
const vendors = require('../../controllers/assets/vendorsController');
const { validate } = require('../../middleware/validate');
const schema = require('../../schemas/assets');

router.use(requireAuth);
router.use(requireOrg);

router.post('/',    validate(schema.vendorCreate), vendors.createVendor);
router.get('/', vendors.listVendors);
router.get('/:id', vendors.getVendor);
router.put('/:id', validate(schema.vendorUpdate), vendors.updateVendor);
router.delete('/:id', vendors.deleteVendor);

module.exports = router;
