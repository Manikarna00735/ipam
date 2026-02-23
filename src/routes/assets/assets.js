const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { requireOrg } = require('../../middleware/org');
const assets = require('../../controllers/assets/assetsController');
const { requireFieldsTypes } = require('../../middleware/validators');

router.use(requireAuth);
router.use(requireOrg);

// CRUD Operations
router.post(
  '/',
  requireFieldsTypes({
    asset_id: 'string',
    category: 'string',
    site_uuid: 'uuid',
    status: 'string',
    qr_code_url: 'string'
  }),
  assets.createAsset
);

router.get('/', assets.listAssets);
router.get('/:id', assets.getAsset);
router.put('/:id', assets.updateAsset);
router.delete('/:id', assets.deleteAsset);

module.exports = router;
