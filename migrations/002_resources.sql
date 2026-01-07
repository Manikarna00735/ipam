-- Providers
CREATE TABLE IF NOT EXISTS providers (
  id SERIAL PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  asns_csv TEXT,
  description TEXT,
  tags_csv TEXT,
  comments TEXT,
  created_by INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (org_id, slug)
);

-- Sites
CREATE TABLE IF NOT EXISTS sites (
  id SERIAL PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT,
  region INTEGER,
  facility TEXT,
  tenant INTEGER,
  tags_csv TEXT,
  location TEXT,
  created_by INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (org_id, slug)
);

-- Regions
CREATE TABLE IF NOT EXISTS regions (
  id SERIAL PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  parent_id INTEGER,
  parent_name TEXT,
  tags_csv TEXT,
  created_by INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (org_id, slug)
);

-- Locations
CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT,
  site INTEGER,
  parent_id INTEGER,
  description TEXT,
  tags_csv TEXT,
  tenant INTEGER,
  created_by INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (org_id, slug)
);

-- Racks
CREATE TABLE IF NOT EXISTS racks (
  id SERIAL PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT,
  site INTEGER,
  location INTEGER,
  tenant INTEGER,
  devices JSONB,
  created_by INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (org_id, slug)
);

-- Manufacturers
CREATE TABLE IF NOT EXISTS manufacturers (
  id SERIAL PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  tags TEXT,
  created_by INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (org_id, slug)
);

-- Platforms
CREATE TABLE IF NOT EXISTS platforms (
  id SERIAL PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  manufacturer INTEGER,
  napalm_driver TEXT,
  description TEXT,
  created_by INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (org_id, slug)
);

-- VRFs
CREATE TABLE IF NOT EXISTS vrfs (
  id SERIAL PRIMARY KEY,
  org_id TEXT NOT NULL,
  vfsId TEXT,
  name TEXT NOT NULL,
  description TEXT,
  tag TEXT,
  import_target TEXT,
  export_target TEXT,
  tenant_group INTEGER,
  tenant INTEGER,
  comment TEXT,
  created_by INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- VLANs
CREATE TABLE IF NOT EXISTS vlans (
  id SERIAL PRIMARY KEY,
  org_id TEXT NOT NULL,
  vId TEXT,
  name TEXT,
  status TEXT,
  description TEXT,
  tag TEXT,
  comment TEXT,
  role TEXT,
  tenant INTEGER,
  tenant_group INTEGER,
  vlan_group INTEGER,
  created_by INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Circuits
CREATE TABLE IF NOT EXISTS circuits (
  id SERIAL PRIMARY KEY,
  org_id TEXT NOT NULL,
  circuitId TEXT,
  provider INTEGER,
  type TEXT,
  status TEXT,
  sideA JSONB,
  sideZ JSONB,
  tenant_group INTEGER,
  tenant INTEGER,
  customer_ip INET,
  gateway_ip INET,
  tags JSONB,
  comments TEXT,
  created_by INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Devices
CREATE TABLE IF NOT EXISTS devices (
  id SERIAL PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  device_role TEXT,
  device_type TEXT,
  site INTEGER,
  rack INTEGER,
  manufacturer INTEGER,
  platform INTEGER,
  tenant INTEGER,
  services JSONB,
  created_by INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Interfaces
CREATE TABLE IF NOT EXISTS interfaces (
  id SERIAL PRIMARY KEY,
  org_id TEXT NOT NULL,
  device INTEGER,
  name TEXT,
  type TEXT,
  speed INTEGER,
  duplex TEXT,
  vRF INTEGER,
  mac TEXT,
  tags JSONB,
  created_by INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Wireless
CREATE TABLE IF NOT EXISTS wireless (
  id SERIAL PRIMARY KEY,
  org_id TEXT NOT NULL,
  ssId TEXT,
  status TEXT,
  group_name TEXT,
  vLAN INTEGER,
  tenant INTEGER,
  interfaces JSONB,
  created_by INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- IPAM: Prefixes, Subnets, IPs
CREATE TABLE IF NOT EXISTS prefixes (
  id SERIAL PRIMARY KEY,
  org_id TEXT NOT NULL,
  status TEXT,
  prefix CIDR,
  vrf INTEGER,
  tenant INTEGER,
  site INTEGER,
  vlan INTEGER,
  role TEXT,
  children_count INTEGER DEFAULT 0,
  created_by INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subnets (
  id SERIAL PRIMARY KEY,
  org_id TEXT NOT NULL,
  prefix_id INTEGER REFERENCES prefixes(id) ON DELETE CASCADE,
  subnet CIDR,
  status TEXT,
  vrf INTEGER,
  tenant INTEGER,
  site INTEGER,
  vlan INTEGER,
  role TEXT,
  created_by INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ips (
  id SERIAL PRIMARY KEY,
  org_id TEXT NOT NULL,
  subnet_id INTEGER REFERENCES subnets(id) ON DELETE CASCADE,
  ip INET,
  created_by INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (subnet_id, ip)
);
