DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- create providers table
-- mandatory fields: name, slug, orgid, user_id
DROP TABLE IF exists providers;
CREATE TABLE IF NOT EXISTS providers (
  uuid uuid PRIMARY key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  tagscsv text,
  asnscsv text,
  accountcount integer,
  circuitcount integer,
  comments text,
  orgid varchar(128),
  isactive boolean default true,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updatedat TIMESTAMP WITH TIME zone,
  user_id varchar(128), 
  unique(orgid,slug)
);

-- create regions table
-- mandatory fields: name, slug, orgid, user_id
DROP TABLE IF exists regions;
CREATE TABLE IF NOT EXISTS regions (
  uuid uuid PRIMARY key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  tagscsv text,
  sitescount integer,
  orgid varchar(128),
  isactive boolean default true,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updatedat TIMESTAMP WITH TIME zone,
  user_id varchar(128),
  unique(orgid,slug)
);


-- create sites table
-- mandatory fields: name, slug, status, orgid, user_id
DROP TABLE IF exists sites;
CREATE TABLE IF NOT EXISTS sites (
  uuid uuid PRIMARY key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  tagscsv text,
  tenant text,
  tenantgroup text,
  region_uuid uuid references regions("uuid"),
  location_uuid uuid ,
  physicaladdress text,
  shippingaddress text,
  orgid varchar(128),
  comments text,
  status text not null,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updatedat TIMESTAMP WITH TIME zone,
  user_id varchar(128),
  unique(orgid,slug)
);

-- create locations table
-- mandatory fields: name, slug, status, site_uuid, orgid, user_id
DROP TABLE IF exists locations;
CREATE TABLE IF NOT EXISTS locations (
  uuid uuid PRIMARY key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  site_uuid uuid references sites("uuid"),
  rackscount int,
  devicescount int,
  tagscsv text,
  tenant text,
  tenantgroup text,
  orgid varchar(128),
  status text not null,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updatedat TIMESTAMP WITH TIME zone,
  user_id varchar(128),
  unique(orgid,slug)
);


--create manufacturers table
-- mandatory fields: name, slug, orgid, user_id
DROP TABLE IF exists manufacturers;
CREATE TABLE IF NOT EXISTS manufacturers (
  uuid uuid PRIMARY key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  tags text,
  orgid varchar(128),
  isactive boolean default true,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updatedat TIMESTAMP WITH TIME zone,
  user_id varchar(128),
  unique(orgid,slug)
);

--create platforms table
-- mandatory fields: name, slug, orgid, user_id
DROP TABLE IF exists platforms;
CREATE TABLE IF NOT EXISTS platforms (
  uuid uuid PRIMARY key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  tags text,
  manufacturer_uuid uuid references manufacturers("uuid"),
  orgid varchar(128),
  isactive boolean default true,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updatedat TIMESTAMP WITH TIME zone,
  user_id varchar(128),
  unique(orgid,slug)
);

-- create vlans table
-- mandatory fields: name, status, orgid, user_id
DROP TABLE IF exists vlans;
CREATE TABLE IF NOT EXISTS vlans (
  uuid uuid PRIMARY key default gen_random_uuid(),
  name text not null,
  role text,
  status text not null,
  description text,
  tag text,
  tenant text,
  orgid varchar(128),
  comments text,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updatedat TIMESTAMP WITH TIME zone,
  user_id varchar(128)
);

-- create vrfs table
-- mandatory fields: name, orgid, user_id
DROP TABLE IF exists vrfs;
CREATE TABLE IF NOT EXISTS vrfs (
  uuid uuid PRIMARY key default gen_random_uuid(),
  name text not null,
  description text,
  tag text,
  tenant text,
  importtarget text,
  exporttarget text,
  orgid varchar(128),
  comments text,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updatedat TIMESTAMP WITH TIME zone,
  user_id varchar(128)
);

-- create racks table
-- mandatory fields: name, slug, site_uuid, status, orgid, user_id
DROP TABLE IF exists racks;
CREATE TABLE IF NOT EXISTS racks (
  uuid uuid PRIMARY key default gen_random_uuid(),
  name text not null,
  slug text not null,
  site_uuid uuid references sites("uuid"),
  description text,
  assettag text,
  tagscsv text,
  tenant text,
  facilityid text,
  role text,
  location_uuid uuid references locations ("uuid"),
  heightu integer,
  widthin integer,
  depth integer,
  powerutilization integer,
  spaceutilization integer,
  serialnumber text,
  orgid varchar(128),
  comments text,
  status text not null,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updatedat TIMESTAMP WITH TIME zone,
  user_id varchar(128),
  unique(orgid,slug)
);

-- create devices table
-- mandatory fields: name, site_uuid, devicetype, role, orgid, user_id
DROP TABLE IF exists devices;
CREATE TABLE IF NOT EXISTS devices (
  uuid uuid PRIMARY key default gen_random_uuid(),
  name text not null,
  site_uuid uuid references sites("uuid"),
  devicetype text,
  role text not null,
  description text,
  assettag text,
  tag text,
  tenant text,
  tenantgroup text,
  manufacturer_uuid uuid references manufacturers("uuid"),
  interfaces text,
  ips text,
  airflow text,
  cluster text,
  face text,
  platform_uuid uuid references platforms("uuid"),
  rack_uuid uuid references racks("uuid"),
  serialno text,
  services text,
  location_uuid uuid references locations("uuid"),
  position text,
  virtualchassis text,
  orgid varchar(128),
  comments text,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updatedat TIMESTAMP WITH TIME zone,
  user_id varchar(128)
);

-- create wireless table
-- mandatory fields: ssid, status, orgid, user_id
DROP TABLE IF exists wireless;
CREATE TABLE IF NOT EXISTS wireless (
  uuid uuid PRIMARY key default gen_random_uuid(),
  ssid text not null,
  description text,
  tag text,
  tenant text,
  tenantgroup text,
  vlan_uuid uuid references vlans("uuid"),
  "group" text,
  presharekey text,
  authtype text,
  authcipher text,
  interfaces jsonb,
  orgid varchar(128),
  comments text,
  status text not null,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updatedat TIMESTAMP WITH TIME zone,
  user_id varchar(128)
);

-- create interfaces table
-- mandatory fields: name, device, type, orgid, user_id
DROP TABLE IF exists interfaces;
CREATE TABLE IF NOT EXISTS interfaces (
  uuid uuid PRIMARY key default gen_random_uuid(),
  name text not null,
  device_uuid uuid references devices("uuid"),
  type text not null,
  description text,
  speed text,
  bridgeinterface text,
  channelfrequency text,
  channelwidth text,
  laginterface text,
  label text,
  mac text,
  mtu text,
  parentinterface text,
  poemode text,
  poetype text,
  tags text,
  transmitpower text,
  vrf_uuid uuid references vrfs("uuid"),
  virtualdevicecontext text,
  wirelesschannel text,
  wirelesslangroup text,
  wirelessrole text,
  orgid varchar(128),
  comments text,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updatedat TIMESTAMP WITH TIME zone,
  user_id varchar(128)
);

-- create circuits table
-- mandatory fields: provider_uuid, type, status, orgid, user_id
DROP TABLE IF EXISTS circuits;
CREATE TABLE IF NOT EXISTS circuits (
  uuid uuid PRIMARY key default gen_random_uuid(),
  commitrate text,
  customerip text,
  description text,
  gatewayip text,
  installed date,
  ordernumber text,
  provider_uuid uuid references providers("uuid"),
  provideraccount text,
  tags text,
  tenant text,
  terminates date,
  type text not null,
  orgid varchar(128),
  comments text,
  status text not null,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updatedat TIMESTAMP WITH TIME zone,
  user_id varchar(128)
);

--create network table
DROP TABLE IF EXISTS networks;
CREATE TABLE IF NOT EXISTS networks (
  uuid uuid PRIMARY key default gen_random_uuid(),
  prefix inet not null,
  site_uuid uuid REFERENCES sites("uuid"),
  vrf_uuid uuid REFERENCES vrfs("uuid"),
  vlan_uuid uuid REFERENCES vlans("uuid"),
  role text not null,
  tags text,
  tenant text not null,
  tenantgroup text,
  orgid varchar(128),
  status text not null,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updatedat TIMESTAMP WITH TIME zone,
  user_id varchar(128)
 );

 
--create subnet table
DROP TABLE IF EXISTS subnets;
CREATE TABLE IF NOT EXISTS subnets (
  uuid uuid PRIMARY key default gen_random_uuid(),
  networks_uuid uuid REFERENCES networks("uuid") ON DELETE cascade,
  subnet inet not null,
  site_uuid uuid REFERENCES sites("uuid"),
  vrf_uuid uuid REFERENCES vrfs("uuid"),
  vlan_uuid uuid REFERENCES vlans("uuid"),
  role text not null,
  tags text,
  description text,
  tenant text not null,
  tenantgroup text,
  orgid varchar(128),
  status text not null,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updatedat TIMESTAMP WITH TIME zone,
  user_id varchar(128)
 );

--create ips table
DROP TABLE IF EXISTS ips;
CREATE TABLE IF NOT EXISTS ips(
  uuid uuid PRIMARY key default gen_random_uuid(),
  subnets_uuid uuid references subnets("uuid") ON DELETE cascade,
  ip inet not null,
  orgid varchar(128),
  status text default 'available',
  hostname text,
  description text,
  vrf_uuid uuid REFERENCES vrfs("uuid"),
  vlan_uuid uuid REFERENCES vlans("uuid"),
  is_gateway boolean,
  tags text,
  tenant text,
  tenantgroup text,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updatedat TIMESTAMP WITH TIME zone,
  user_id varchar(128)
);

