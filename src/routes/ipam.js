const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireOrg } = require('../middleware/org');
const ipam = require('../controllers/ipamController');
const { requireFieldsTypes } = require('../middleware/validators');

router.use(requireAuth);
router.use(requireOrg);

// Prefixes routes
router.post('/prefixes', requireFieldsTypes({ 
  prefix: 'string', 
  site_uuid: 'string', 
  vrf_uuid: 'string', 
  vlan_uuid: 'string', 
  role: 'string', 
  tenant: 'string', 
  status: 'string' 
}), ipam.createPrefix);
router.get('/prefixes', ipam.listPrefixes);
router.get('/prefixes/:id', ipam.getPrefix);
router.put('/prefixes/:id', ipam.updatePrefix);
router.delete('/prefixes/:id', ipam.deletePrefix);

// Subnets routes (nested under prefixes)
router.post('/prefixes/:id/subnets', requireFieldsTypes({ 
  subnet: 'string', 
  site_uuid: 'string', 
  vrf_uuid: 'string', 
  vlan_uuid: 'string', 
  role: 'string', 
  tenant: 'string', 
  status: 'string' 
}), ipam.createSubnet);
router.get('/prefixes/:id/subnets', ipam.listSubnets);
router.put('/prefixes/:id/subnets/:subnetId', ipam.updateSubnet);
router.delete('/prefixes/:id/subnets/:subnetId', ipam.deleteSubnet);

// IPs routes (nested under prefixes and subnets)
router.post('/prefixes/:id/subnets/:subnetId/ips', ipam.createIP);
router.post('/prefixes/:id/subnets/:subnetId/ips/batch', ipam.createIPsBatch);
router.get('/prefixes/:id/subnets/:subnetId/ips', ipam.listIPs);
router.put('/prefixes/:id/subnets/:subnetId/ips/:ipId', ipam.updateIP);
router.delete('/prefixes/:id/subnets/:subnetId/ips/:ipId', ipam.deleteIP);

module.exports = router;
