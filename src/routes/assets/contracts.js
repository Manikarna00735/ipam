const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { requireOrg } = require('../../middleware/org');
const contracts = require('../../controllers/assets/contractsController');
const { requireFieldsTypes } = require('../../middleware/validators');

router.use(requireAuth);
router.use(requireOrg);

router.post('/', requireFieldsTypes({ contract_name: 'string', contract_type: 'string', vendor_uuid: 'uuid' }), contracts.createContract);
router.get('/', contracts.listContracts);
router.get('/:id', contracts.getContract);
router.put('/:id', contracts.updateContract);
router.delete('/:id', contracts.deleteContract);

module.exports = router;
