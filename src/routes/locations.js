const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireOrg } = require('../middleware/org');
const locations = require('../controllers/locationsController');
const { requireFieldsTypes } = require('../middleware/validators');

router.use(requireAuth);
router.use(requireOrg);

router.post('/', requireFieldsTypes({ name: 'string', slug: 'string', status: 'string', site_uuid: 'uuid' }), locations.createLocations);
router.get('/', locations.listLocations);
router.get('/:id', locations.getLocation);
router.put('/:id', locations.updateLocation);
router.delete('/:id', locations.deleteLocation);
module.exports = router;
