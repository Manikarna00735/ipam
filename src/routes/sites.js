const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireOrg } = require('../middleware/org');
const sites = require('../controllers/sitesController');
const { requireFieldsTypes } = require('../middleware/validators');

router.use(requireAuth);
router.use(requireOrg);

router.post('/', requireFieldsTypes({ name: 'string', slug: 'string', status: 'boolean' }), sites.createSites);
router.get('/', sites.listSites);
router.get('/:id', sites.getSite);
router.put('/:id', sites.updateSite);
router.delete('/:id', sites.deleteSite);
module.exports = router;
