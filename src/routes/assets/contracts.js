const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { requireOrg } = require('../../middleware/org');
const contracts = require('../../controllers/assets/contractsController');
const { validate } = require('../../middleware/validate');
const schema = require('../../schemas/assets');

router.use(requireAuth);
router.use(requireOrg);

router.post('/',    validate(schema.contractCreate), contracts.createContract);
router.get('/', contracts.listContracts);
router.get('/:id', contracts.getContract);
router.put('/:id', validate(schema.contractUpdate), contracts.updateContract);
router.delete('/:id', contracts.deleteContract);

module.exports = router;
