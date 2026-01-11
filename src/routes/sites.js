const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireOrg } = require('../middleware/org');
const sites = require('../controllers/sitesController');

router.use(requireAuth);
router.use(requireOrg);

router.post('/', sites.createSites);
router.get('/', sites.listSites);
router.get('/:id', sites.getSite);
router.put('/:id', sites.updateSite);
router.delete('/:id', sites.deleteSite);
module.exports = router;
