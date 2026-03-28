const Joi = require('joi');

// ─── Reusable primitives ──────────────────────────────────────────────────────
const str     = () => Joi.string().trim().max(255).allow('', null);
const strReq  = () => Joi.string().trim().min(1).max(255).required();
const slug    = () => Joi.string().trim().lowercase().pattern(/^[a-z0-9-]+$/).max(100)
                        .required()
                        .messages({ 'string.pattern.base': '"slug" must only contain lowercase letters, numbers, and hyphens' });
const uuidReq = () => Joi.string().uuid().required();
const uuidOpt = () => Joi.string().uuid().allow('', null);
const text    = () => Joi.string().trim().max(10000).allow('', null);
const dateStr = () => Joi.string().isoDate().allow('', null);

// ─── VLANs ───────────────────────────────────────────────────────────────────
exports.vlanCreate = Joi.object({
  name:        strReq(),
  status:      strReq(),
  role:        str(),
  description: text(),
  tag:         str(),
  tenant:      str(),
  comments:    text(),
});

exports.vlanUpdate = Joi.object({
  name:        Joi.string().trim().min(1).max(255),
  status:      Joi.string().trim().min(1).max(50),
  role:        str(),
  description: text(),
  tag:         str(),
  tenant:      str(),
  comments:    text(),
}).min(1);

// ─── VRFs ────────────────────────────────────────────────────────────────────
exports.vrfCreate = Joi.object({
  name:         strReq(),
  description:  text(),
  tag:          str(),
  tenant:       str(),
  importtarget: str(),
  exporttarget: str(),
  comments:     text(),
});

exports.vrfUpdate = Joi.object({
  name:         Joi.string().trim().min(1).max(255),
  description:  text(),
  tag:          str(),
  tenant:       str(),
  importtarget: str(),
  exporttarget: str(),
  comments:     text(),
}).min(1);

// ─── Regions ─────────────────────────────────────────────────────────────────
exports.regionCreate = Joi.object({
  name:        strReq(),
  slug:        slug(),
  description: text(),
  tagscsv:     str(),
  sitescount:  Joi.number().integer().min(0).allow(null),
});

exports.regionUpdate = Joi.object({
  name:        Joi.string().trim().min(1).max(255),
  slug:        Joi.string().trim().lowercase().pattern(/^[a-z0-9-]+$/).max(100),
  description: text(),
  tagscsv:     str(),
  sitescount:  Joi.number().integer().min(0).allow(null),
}).min(1);

// ─── Sites ───────────────────────────────────────────────────────────────────
exports.siteCreate = Joi.object({
  name:            strReq(),
  slug:            slug(),
  status:          strReq(),
  description:     text(),
  tagscsv:         str(),
  tenant:          str(),
  tenantgroup:     str(),
  region:          uuidOpt(),
  location:        uuidOpt(),
  physicaladdress: text(),
  shippingaddress: text(),
  comments:        text(),
});

exports.siteUpdate = Joi.object({
  name:            Joi.string().trim().min(1).max(255),
  slug:            Joi.string().trim().lowercase().pattern(/^[a-z0-9-]+$/).max(100),
  status:          Joi.string().trim().min(1).max(50),
  description:     text(),
  tagscsv:         str(),
  tenant:          str(),
  tenantgroup:     str(),
  region:          uuidOpt(),
  location:        uuidOpt(),
  physicaladdress: text(),
  shippingaddress: text(),
  comments:        text(),
}).min(1);

// ─── Locations ───────────────────────────────────────────────────────────────
exports.locationCreate = Joi.object({
  name:         strReq(),
  slug:         slug(),
  status:       strReq(),
  site_uuid:    uuidReq(),
  description:  text(),
  rackscount:   Joi.number().integer().min(0).allow(null),
  devicescount: Joi.number().integer().min(0).allow(null),
  tagscsv:      str(),
  tenant:       str(),
  tenantgroup:  str(),
});

exports.locationUpdate = Joi.object({
  name:         Joi.string().trim().min(1).max(255),
  slug:         Joi.string().trim().lowercase().pattern(/^[a-z0-9-]+$/).max(100),
  status:       Joi.string().trim().min(1).max(50),
  site_uuid:    uuidOpt(),
  description:  text(),
  rackscount:   Joi.number().integer().min(0).allow(null),
  devicescount: Joi.number().integer().min(0).allow(null),
  tagscsv:      str(),
  tenant:       str(),
  tenantgroup:  str(),
}).min(1);

// ─── Manufacturers ───────────────────────────────────────────────────────────
exports.manufacturerCreate = Joi.object({
  name:        strReq(),
  slug:        slug(),
  description: text(),
  tags:        str(),
});

exports.manufacturerUpdate = Joi.object({
  name:        Joi.string().trim().min(1).max(255),
  slug:        Joi.string().trim().lowercase().pattern(/^[a-z0-9-]+$/).max(100),
  description: text(),
  tags:        str(),
}).min(1);

// ─── Platforms ───────────────────────────────────────────────────────────────
exports.platformCreate = Joi.object({
  name:             strReq(),
  slug:             slug(),
  description:      text(),
  tags:             str(),
  manufacturer_uuid: uuidOpt(),
});

exports.platformUpdate = Joi.object({
  name:             Joi.string().trim().min(1).max(255),
  slug:             Joi.string().trim().lowercase().pattern(/^[a-z0-9-]+$/).max(100),
  description:      text(),
  tags:             str(),
  manufacturer_uuid: uuidOpt(),
}).min(1);

// ─── Providers ───────────────────────────────────────────────────────────────
exports.providerCreate = Joi.object({
  name:        strReq(),
  slug:        slug(),
  description: text(),
  comments:    text(),
  asnscsv:     str(),
  tagscsv:     str(),
});

exports.providerUpdate = Joi.object({
  name:        Joi.string().trim().min(1).max(255),
  slug:        Joi.string().trim().lowercase().pattern(/^[a-z0-9-]+$/).max(100),
  description: text(),
  comments:    text(),
  asnscsv:     str(),
  tagscsv:     str(),
}).min(1);

// ─── Racks ───────────────────────────────────────────────────────────────────
exports.rackCreate = Joi.object({
  name:             strReq(),
  slug:             slug(),
  status:           strReq(),
  site_uuid:        uuidReq(),
  description:      text(),
  assettag:         str(),
  tagscsv:          str(),
  tenant:           str(),
  facilityid:       str(),
  role:             str(),
  location_uuid:    uuidOpt(),
  heightu:          Joi.number().integer().min(1).max(100).allow(null),
  widthin:          Joi.number().integer().min(1).allow(null),
  depth:            Joi.number().integer().min(1).allow(null),
  powerutilization: Joi.number().integer().min(0).max(100).allow(null),
  spaceutilization: Joi.number().integer().min(0).max(100).allow(null),
  serialnumber:     str(),
  comments:         text(),
});

exports.rackUpdate = Joi.object({
  name:             Joi.string().trim().min(1).max(255),
  slug:             Joi.string().trim().lowercase().pattern(/^[a-z0-9-]+$/).max(100),
  status:           Joi.string().trim().min(1).max(50),
  site_uuid:        uuidOpt(),
  description:      text(),
  assettag:         str(),
  tagscsv:          str(),
  tenant:           str(),
  facilityid:       str(),
  role:             str(),
  location_uuid:    uuidOpt(),
  heightu:          Joi.number().integer().min(1).max(100).allow(null),
  widthin:          Joi.number().integer().min(1).allow(null),
  depth:            Joi.number().integer().min(1).allow(null),
  powerutilization: Joi.number().integer().min(0).max(100).allow(null),
  spaceutilization: Joi.number().integer().min(0).max(100).allow(null),
  serialnumber:     str(),
  comments:         text(),
}).min(1);

// ─── Devices ─────────────────────────────────────────────────────────────────
exports.deviceCreate = Joi.object({
  name:             strReq(),
  devicetype:       strReq(),
  role:             strReq(),
  site_uuid:        uuidReq(),
  description:      text(),
  assettag:         str(),
  tag:              str(),
  tenant:           str(),
  tenantgroup:      str(),
  manufacturer_uuid: uuidOpt(),
  interfaces:       str(),
  ips:              str(),
  airflow:          str(),
  cluster:          str(),
  platform_uuid:    uuidOpt(),
  serialno:         str(),
  services:         str(),
  location_uuid:    uuidOpt(),
  virtualchassis:   str(),
  comments:         text(),
});

exports.deviceUpdate = Joi.object({
  name:             Joi.string().trim().min(1).max(255),
  devicetype:       Joi.string().trim().min(1).max(255),
  role:             Joi.string().trim().min(1).max(255),
  site_uuid:        uuidOpt(),
  description:      text(),
  assettag:         str(),
  tag:              str(),
  tenant:           str(),
  tenantgroup:      str(),
  manufacturer_uuid: uuidOpt(),
  interfaces:       str(),
  ips:              str(),
  airflow:          str(),
  cluster:          str(),
  platform_uuid:    uuidOpt(),
  serialno:         str(),
  services:         str(),
  location_uuid:    uuidOpt(),
  virtualchassis:   str(),
  comments:         text(),
}).min(1);

// ─── Interfaces ──────────────────────────────────────────────────────────────
exports.interfaceCreate = Joi.object({
  name:                strReq(),
  device_uuid:         uuidReq(),
  type:                strReq(),
  description:         text(),
  speed:               str(),
  bridgeinterface:     str(),
  channelfrequency:    str(),
  channelwidth:        str(),
  laginterface:        str(),
  label:               str(),
  mac:                 Joi.string().trim().max(20).allow('', null),
  mtu:                 str(),
  parentinterface:     str(),
  poemode:             str(),
  poetype:             str(),
  tags:                str(),
  transmitpower:       str(),
  vrf_uuid:            uuidOpt(),
  virtualdevicecontext: str(),
  wirelesschannel:     str(),
  wirelesslangroup:    str(),
  wirelessrole:        str(),
  comments:            text(),
});

exports.interfaceUpdate = Joi.object({
  name:                Joi.string().trim().min(1).max(255),
  device_uuid:         uuidOpt(),
  type:                Joi.string().trim().min(1).max(255),
  description:         text(),
  speed:               str(),
  bridgeinterface:     str(),
  channelfrequency:    str(),
  channelwidth:        str(),
  laginterface:        str(),
  label:               str(),
  mac:                 Joi.string().trim().max(20).allow('', null),
  mtu:                 str(),
  parentinterface:     str(),
  poemode:             str(),
  poetype:             str(),
  tags:                str(),
  transmitpower:       str(),
  vrf_uuid:            uuidOpt(),
  virtualdevicecontext: str(),
  wirelesschannel:     str(),
  wirelesslangroup:    str(),
  wirelessrole:        str(),
  comments:            text(),
}).min(1);

// ─── Circuits ────────────────────────────────────────────────────────────────
exports.circuitCreate = Joi.object({
  provider_uuid:   uuidReq(),
  type:            strReq(),
  status:          strReq(),
  commitrate:      str(),
  customerip:      str(),
  description:     text(),
  gatewayip:       str(),
  installed:       dateStr(),
  ordernumber:     str(),
  provideraccount: str(),
  tags:            str(),
  tenant:          str(),
  terminates:      dateStr(),
  comments:        text(),
});

exports.circuitUpdate = Joi.object({
  provider_uuid:   uuidOpt(),
  type:            Joi.string().trim().min(1).max(255),
  status:          Joi.string().trim().min(1).max(50),
  commitrate:      str(),
  customerip:      str(),
  description:     text(),
  gatewayip:       str(),
  installed:       dateStr(),
  ordernumber:     str(),
  provideraccount: str(),
  tags:            str(),
  tenant:          str(),
  terminates:      dateStr(),
  comments:        text(),
}).min(1);

// ─── Wireless ────────────────────────────────────────────────────────────────
exports.wirelessCreate = Joi.object({
  ssid:        strReq(),
  status:      strReq(),
  description: text(),
  tag:         str(),
  tenant:      str(),
  tenantgroup: str(),
  vlan:        uuidOpt(),   // body field 'vlan' maps to DB column vlan_uuid
  group:       str(),
  presharekey: str(),
  authtype:    str(),
  authcipher:  str(),
  interfaces:  Joi.alternatives().try(Joi.array(), Joi.string().trim()).allow(null),
  comments:    text(),
});

exports.wirelessUpdate = Joi.object({
  ssid:        Joi.string().trim().min(1).max(255),
  status:      Joi.string().trim().min(1).max(50),
  description: text(),
  tag:         str(),
  tenant:      str(),
  tenantgroup: str(),
  vlan:        uuidOpt(),
  group:       str(),
  presharekey: str(),
  authtype:    str(),
  authcipher:  str(),
  interfaces:  Joi.alternatives().try(Joi.array(), Joi.string().trim()).allow(null),
  comments:    text(),
}).min(1);

// ─── Prefixes (networks table) ───────────────────────────────────────────────
exports.prefixCreate = Joi.object({
  prefix:      Joi.string().trim().min(1).max(50).required(),
  site_uuid:   uuidReq(),
  status:      strReq(),
  role:        strReq(),
  tenant:      strReq(),
  vrf_uuid:    uuidOpt(),
  vlan_uuid:   uuidOpt(),
  tags:        str(),
  tenantgroup: str(),
});

exports.prefixUpdate = Joi.object({
  site_uuid:   uuidOpt(),
  vrf_uuid:    uuidOpt(),
  vlan_uuid:   uuidOpt(),
  role:        Joi.string().trim().min(1).max(255),
  tags:        str(),
  tenant:      Joi.string().trim().min(1).max(255),
  tenantgroup: str(),
  status:      Joi.string().trim().min(1).max(50),
}).min(1);

// ─── Subnets ─────────────────────────────────────────────────────────────────
exports.subnetCreate = Joi.object({
  subnet:      Joi.string().trim().min(1).max(50).required(),
  site_uuid:   uuidReq(),
  status:      strReq(),
  role:        strReq(),
  tenant:      strReq(),
  vrf_uuid:    uuidOpt(),
  vlan_uuid:   uuidOpt(),
  tags:        str(),
  description: text(),
  tenantgroup: str(),
});

exports.subnetUpdate = Joi.object({
  site_uuid:   uuidOpt(),
  vrf_uuid:    uuidOpt(),
  vlan_uuid:   uuidOpt(),
  role:        Joi.string().trim().min(1).max(255),
  tags:        str(),
  description: text(),
  tenant:      Joi.string().trim().min(1).max(255),
  tenantgroup: str(),
  status:      Joi.string().trim().min(1).max(50),
}).min(1);

// ─── IPs ─────────────────────────────────────────────────────────────────────
// Note: IPs have no POST (auto-generated). Only PUT with a fixed allowlist.
// 'decription' is a known typo in the controller — preserved here to match DB column.
exports.ipUpdate = Joi.object({
  status:      Joi.string().trim().min(1).max(50),
  hostname:    str(),
  decription:  text(),   // intentional typo — matches DB column name
  vrf_uuid:    uuidOpt(),
  vlan_uuid:   uuidOpt(),
  is_gateway:  Joi.boolean().truthy('true').falsy('false').allow(null),
  tags:        str(),
  tenant:      str(),
  tenantgroup: str(),
}).min(1);
