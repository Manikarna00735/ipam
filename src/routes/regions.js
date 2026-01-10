const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireOrg } = require('../middleware/org');
const regions = require('../controllers/regionsController');

router.use(requireAuth);
router.use(requireOrg);


router.post('/', regions.createProviders);
router.get('/', regions.listProviders);
router.get('/:id', regions.getProvider);
router.put('/:id', regions.updateProvider);
router.delete('/:id', regions.deleteProvider);
module.exports = router;