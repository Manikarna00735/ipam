const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { requireOrg } = require('../../middleware/org');
const circuits = require('../../controllers/ipam/circuitsController');
const { validate } = require('../../middleware/validate');
const schema = require('../../schemas/ipam');

router.use(requireAuth);
router.use(requireOrg);

router.post('/',    validate(schema.circuitCreate), circuits.createCircuits);
router.get('/', circuits.listCircuits);
router.get('/:id', circuits.getCircuit);
router.put('/:id', validate(schema.circuitUpdate), circuits.updateCircuit);
router.delete('/:id', circuits.deleteCircuit);

module.exports = router;
