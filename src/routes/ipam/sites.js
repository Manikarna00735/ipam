const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { requireOrg } = require('../../middleware/org');
const sites = require('../../controllers/ipam/sitesController');
const { validate } = require('../../middleware/validate');
const schema = require('../../schemas/ipam');

router.use(requireAuth);
router.use(requireOrg);

router.post('/',    validate(schema.siteCreate), sites.createSites);
router.get('/', sites.listSites);
router.get('/:id', sites.getSite);
router.put('/:id', validate(schema.siteUpdate), sites.updateSite);
router.delete('/:id', sites.deleteSite);

module.exports = router;
