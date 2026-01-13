-- create providers table
-- mandatory fields: name, slug, orgid, user_id
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
CREATE TABLE IF NOT EXISTS regions (
  uuid uuid PRIMARY key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  tagscsv text,
  sitescount integer,
  parent_uuid uuid,
  parent_name text,
  orgid varchar(128),
  isactive boolean default true,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updatedat TIMESTAMP WITH TIME zone,
  user_id varchar(128),
  unique(orgid,slug)
);

-- create sites table
-- mandatory fields: name, slug, status, orgid, user_id
CREATE TABLE IF NOT EXISTS sites (
  uuid uuid PRIMARY key default gen_random_uuid(),
  name text not null,
  slug text not null,
  "group" text,
  description text,
  asn text,
  tagscsv text,
  tenant text,
  tenantgroup text,
  timezone text,
  region text,
  location text,
  facility text,
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
-- mandatory fields: name, slug, status, site, orgid, user_id
CREATE TABLE IF NOT EXISTS locations (
  uuid uuid PRIMARY key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  site text,
  rackscount int,
  devicescount int,
  tagscsv text,
  tenant text,
  tenantgroup text,
  parentid text,
  docid text,
  orgid varchar(128),
  status text not null,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updatedat TIMESTAMP WITH TIME zone,
  user_id varchar(128),
  unique(orgid,slug)
);

--create manufacturers table
-- mandatory fields: name, slug, orgid, user_id
CREATE TABLE IF NOT EXISTS manufacturers (
  uuid uuid PRIMARY key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  tags text,
  docid text,
  orgid varchar(128),
  isactive boolean default true,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updatedat TIMESTAMP WITH TIME zone,
  user_id varchar(128),
  unique(orgid,slug)
);

--create platforms table
-- mandatory fields: name, slug, orgid, user_id
CREATE TABLE IF NOT EXISTS platforms (
  uuid uuid PRIMARY key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  tags text,
  manufacturer text,
  configtemplate text,
  napalmdriver text,
  napalmarguments text,
  docid text,
  orgid varchar(128),
  isactive boolean default true,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updatedat TIMESTAMP WITH TIME zone,
  user_id varchar(128),
  unique(orgid,slug)
);

-- create vlans table
-- mandatory fields: name, status, vid, orgid, user_id
CREATE TABLE IF NOT EXISTS vlans (
  uuid uuid PRIMARY key default gen_random_uuid(),
  name text not null,
  role text,
  status text not null,
  description text,
  vid text not null,
  vlangroup text,
  tag text,
  tenant text,
  tenantgroup text,
  docid text,
  orgid varchar(128),
  comments text,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updatedat TIMESTAMP WITH TIME zone,
  user_id varchar(128)
);

-- create vrfs table
-- mandatory fields: name, vfsid, orgid, user_id
CREATE TABLE IF NOT EXISTS vrfs (
  uuid uuid PRIMARY key default gen_random_uuid(),
  name text not null,
  description text,
  vfsid text not null,
  tag text,
  tenant text,
  tenantgroup text,
  importtarget text,
  exporttarget text,
  docid text,
  orgid varchar(128),
  comments text,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updatedat TIMESTAMP WITH TIME zone,
  user_id varchar(128)
);

-- create racks table
-- mandatory fields: name, slug, site, status, orgid, user_id
CREATE TABLE IF NOT EXISTS racks (
  uuid uuid PRIMARY key default gen_random_uuid(),
  name text not null,
  slug text not null,
  site text not null,
  description text,
  assettag text,
  tagscsv text,
  tenant text,
  facilityid text,
  role text,
  type text,
  location text,
  heightu integer,
  widthin integer,
  maxweightkg integer,
  rackweightkg integer,
  totalweightkg integer,
  mountingdepthmm integer,
  outerdepthmm integer,
  outerwidthmm integer,
  powerutilization integer,
  spaceutilization integer,
  serialnumber text,
  devices jsonb,
  orgid varchar(128),
  comments text,
  status text not null,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updatedat TIMESTAMP WITH TIME zone,
  user_id varchar(128),
  unique(orgid,slug)
);

-- create devices table
-- mandatory fields: name, site, devicetype, devicerole, orgid, user_id
CREATE TABLE IF NOT EXISTS devices (
  uuid uuid PRIMARY key default gen_random_uuid(),
  name text not null,
  site text not null,
  devicetype text not null,
  devicerole text not null,
  description text,
  assettag text,
  tag text,
  tenant text,
  tenantgroup text,
  manufacturer text,
  airflow text,
  cluster text,
  configtemplate text,
  face text,
  managementstatus text,
  platform text,
  rack text,
  serialno text,
  services text,
  location text,
  position text,
  virtualchassis text,
  docid text,
  orgid varchar(128),
  comments text,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updatedat TIMESTAMP WITH TIME zone,
  user_id varchar(128)
);

-- create wireless table
-- mandatory fields: ssid, status, orgid, user_id
CREATE TABLE IF NOT EXISTS wireless (
  uuid uuid PRIMARY key default gen_random_uuid(),
  ssid text not null,
  description text,
  tag text,
  tenant text,
  tenantgroup text,
  vlan text,
  "group" text,
  presharekey text,
  authtype text,
  authcipher text,
  docid text,
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
CREATE TABLE IF NOT EXISTS interfaces (
  uuid uuid PRIMARY key default gen_random_uuid(),
  name text not null,
  device text not null,
  type text not null,
  description text,
  bridgeinterface text,
  channelfrequency text,
  channelwidth text,
  duplex text,
  laginterface text,
  label text,
  mac text,
  module text,
  mtu text,
  parentinterface text,
  poemode text,
  poetype text,
  speed text,
  tags text,
  transmitpower text,
  vrf text,
  virtualdevicecontext text,
  wirelesschannel text,
  wirelesslangroup text,
  wirelessrole text,
  wwn text,
  docid text,
  orgid varchar(128),
  comments text,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updatedat TIMESTAMP WITH TIME zone,
  user_id varchar(128)
);

-- create circuits table
-- mandatory fields: circuitid, provider, sidea, type, status, orgid, user_id
CREATE TABLE IF NOT EXISTS circuits (
  uuid uuid PRIMARY key default gen_random_uuid(),
  circuitid text not null,
  circuitreplaced text,
  circuitreplacedby text,
  commitrate text,
  customerip text,
  description text,
  evc text,
  gatewayip text,
  installed date,
  lanblock text,
  ordernumber text,
  provider text not null,
  provideraccount text,
  sidea text not null,
  sidez text,
  tags text,
  tenant text,
  tenantgroup text,
  terminates date,
  type text not null,
  orgid varchar(128),
  comments text,
  status text not null,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updatedat TIMESTAMP WITH TIME zone,
  user_id varchar(128)
);
