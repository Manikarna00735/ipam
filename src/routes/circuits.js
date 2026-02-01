const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireOrg } = require('../middleware/org');
const circuits = require('../controllers/circuitsController');
const { requireFieldsTypes } = require('../middleware/validators');

router.use(requireAuth);
router.use(requireOrg);

router.post('/', requireFieldsTypes({provider: 'uuid', type: 'string', status: 'string'}), circuits.createCircuits);
router.get('/', circuits.listCircuits);
router.get('/:id', circuits.getCircuit);
router.put('/:id', circuits.updateCircuit);
router.delete('/:id', circuits.deleteCircuit);
module.exports = router;
