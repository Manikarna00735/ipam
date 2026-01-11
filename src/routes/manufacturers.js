const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireOrg } = require('../middleware/org');
const manufacturers = require('../controllers/manufacturersController');

router.use(requireAuth);
router.use(requireOrg);

router.post('/', manufacturers.createManufacturers);
router.get('/', manufacturers.listManufacturers);
router.get('/:id', manufacturers.getManufacturer);
router.put('/:id', manufacturers.updateManufacturer);
router.delete('/:id', manufacturers.deleteManufacturer);
module.exports = router;
