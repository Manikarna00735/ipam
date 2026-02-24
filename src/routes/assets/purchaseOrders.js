const express = require('express');
const router = express.Router();
const multer = require('multer');
const { requireAuth } = require('../../middleware/auth');
const { requireOrg } = require('../../middleware/org');
const purchaseOrders = require('../../controllers/assets/purchaseOrdersController');
const { requireFieldsTypes } = require('../../middleware/validators');

// Configure multer for document uploads (10MB max)
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    // Allow common document types
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'text/plain'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, TXT files are allowed'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

router.use(requireAuth);
router.use(requireOrg);

router.post('/', upload.single('document_file'), requireFieldsTypes({ po_id: 'string', vendor_uuid: 'uuid', site_uuid: 'uuid', quantity: 'number', unit_cost: 'number' }), purchaseOrders.createPurchaseOrder);
router.get('/', purchaseOrders.listPurchaseOrders);
router.get('/:id', purchaseOrders.getPurchaseOrder);
router.put('/:id', upload.single('document_file'), purchaseOrders.updatePurchaseOrder);
router.delete('/:id', purchaseOrders.deletePurchaseOrder);

module.exports = router;

