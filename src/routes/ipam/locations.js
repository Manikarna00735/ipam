const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { requireOrg } = require('../../middleware/org');
const locations = require('../../controllers/ipam/locationsController');
const { validate } = require('../../middleware/validate');
const schema = require('../../schemas/ipam');

router.use(requireAuth);
router.use(requireOrg);

router.post('/',    validate(schema.locationCreate), locations.createLocations);
router.get('/', locations.listLocations);
router.get('/:id', locations.getLocation);
router.put('/:id', validate(schema.locationUpdate), locations.updateLocation);
router.delete('/:id', locations.deleteLocation);

module.exports = router;
