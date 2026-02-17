const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { requireOrg } = require('../../middleware/org');
const vendors = require('../../controllers/assets/vendorsController');
const { requireFieldsTypes } = require('../../middleware/validators');

router.use(requireAuth);
router.use(requireOrg);

router.post('/', requireFieldsTypes({ name: 'string', vendor_type: 'string', category: 'string', internal_owner: 'string', email: 'email' }), vendors.createVendor);
router.get('/', vendors.listVendors);
router.get('/:id', vendors.getVendor);
router.put('/:id', vendors.updateVendor);
router.delete('/:id', vendors.deleteVendor);

module.exports = router;
