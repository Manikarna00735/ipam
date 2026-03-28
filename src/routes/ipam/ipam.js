const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { requireOrg } = require('../../middleware/org');
const ipam = require('../../controllers/ipam/ipamController');
const { validate } = require('../../middleware/validate');
const schema = require('../../schemas/ipam');

router.use(requireAuth);
router.use(requireOrg);

// Prefixes routes
router.post('/prefixes',    validate(schema.prefixCreate), ipam.createPrefix);
router.get('/prefixes', ipam.listPrefixes);
router.get('/prefixes/:id', ipam.getPrefix);
router.put('/prefixes/:id', validate(schema.prefixUpdate), ipam.updatePrefix);
router.delete('/prefixes/:id', ipam.deletePrefix);

// Subnets routes (nested under prefixes)
router.post('/prefixes/:id/subnets',    validate(schema.subnetCreate), ipam.createSubnet);
router.get('/prefixes/:id/subnets', ipam.listSubnets);
router.put('/prefixes/:id/subnets/:subnetId', validate(schema.subnetUpdate), ipam.updateSubnet);
router.delete('/prefixes/:id/subnets/:subnetId', ipam.deleteSubnet);

// IPs routes (nested under prefixes and subnets)
// router.post('/prefixes/:id/subnets/:subnetId/ips', ipam.createIP);
// router.post('/prefixes/:id/subnets/:subnetId/ips/batch', ipam.createIPsBatch);
router.get('/prefixes/:id/subnets/:subnetId/ips', ipam.listIPs);
router.put('/prefixes/:id/subnets/:subnetId/ips/:ipId', validate(schema.ipUpdate), ipam.updateIP);
// router.delete('/prefixes/:id/subnets/:subnetId/ips/:ipId', ipam.deleteIP);

module.exports = router;
