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
)

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
)

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
)

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
)

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
)

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
)

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
)