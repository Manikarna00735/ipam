const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireOrg } = require('../middleware/org');
const ipam = require('../controllers/ipamController');

router.use(requireAuth);
router.use(requireOrg);

// Prefixes
const { validatePrefix, validateSubnet, validateIp } = require('../middleware/validators');

router.post('/prefixes', validatePrefix, ipam.createPrefix);
router.get('/prefixes', ipam.listPrefixes);
router.put('/prefixes/:id', ipam.updatePrefix);
router.delete('/prefixes/:id', ipam.deletePrefix);

// Subnets nested under prefix
router.post('/prefixes/:id/subnets', validateSubnet, ipam.createSubnet);
router.get('/prefixes/:id/subnets', ipam.listSubnets);
router.put('/prefixes/:id/subnets/:subnetId', validateSubnet, ipam.updateSubnet);
router.delete('/prefixes/:id/subnets/:subnetId', ipam.deleteSubnet);

// IPs nested under subnet
router.post('/prefixes/:id/subnets/:subnetId/ips', validateIp, ipam.createIp);
router.post('/prefixes/:id/subnets/:subnetId/ips/batch', ipam.batchCreateIps);
router.get('/prefixes/:id/subnets/:subnetId/ips', ipam.listIps);
router.put('/prefixes/:id/subnets/:subnetId/ips/:ipId', validateIp, ipam.updateIp);
router.delete('/prefixes/:id/subnets/:subnetId/ips/:ipId', ipam.deleteIp);

module.exports = router;
