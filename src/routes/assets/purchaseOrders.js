const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { requireOrg } = require('../../middleware/org');
const purchaseOrders = require('../../controllers/assets/purchaseOrdersController');
const { requireFieldsTypes } = require('../../middleware/validators');

router.use(requireAuth);
router.use(requireOrg);

router.post('/', requireFieldsTypes({ po_id: 'string', vendor_uuid: 'uuid', site_uuid: 'uuid', quantity: 'number', unit_cost: 'number' }), purchaseOrders.createPurchaseOrder);
router.get('/', purchaseOrders.listPurchaseOrders);
router.get('/:id', purchaseOrders.getPurchaseOrder);
router.put('/:id', purchaseOrders.updatePurchaseOrder);
router.delete('/:id', purchaseOrders.deletePurchaseOrder);

module.exports = router;
