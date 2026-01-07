const ip = require('ip');

function parseCidr(cidr) {
  // accepts strings like '10.0.0.0/8'
  return ip.cidrSubnet(cidr);
}

function ipInCidr(address, cidr) {
  try {
    const subnet = parseCidr(cidr);
    return subnet.contains(address);
  } catch (e) {
    return false;
  }
}

function cidrContains(parentCidr, childCidr) {
  try {
    const p = parseCidr(parentCidr);
    const c = parseCidr(childCidr);
    // child's network address must be inside parent and child's mask must be >= parent mask
    const parentMask = p.subnetMaskLength || p.subnetMask || 0;
    const childMask = c.subnetMaskLength || c.subnetMask || 0;
    return p.contains(c.networkAddress) && childMask >= parentMask;
  } catch (e) {
    return false;
  }
}

module.exports = { ipInCidr, cidrContains };
