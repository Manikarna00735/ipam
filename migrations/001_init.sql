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

-- table vendors
CREATE TABLE vendors (
  uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  vendor_type VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Active',
  internal_owner VARCHAR(255) NOT NULL,
  primary_contact_name VARCHAR(255),
  email VARCHAR(255) not null,
  phone VARCHAR(50),
  website VARCHAR(500),
  vendor_criticality VARCHAR(50) NOT NULL DEFAULT 'Medium',
  notes TEXT,
  attachments TEXT[] DEFAULT '{}',
  orgid varchar(128),
  createdat  TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updatedat  TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id varchar(128)
);

-- table contracts
CREATE TABLE contracts (
  uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_name VARCHAR(255) NOT NULL,
  vendor_uuid UUID references vendors("uuid"),
  contract_type VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Active',
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  value NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  payment_terms VARCHAR(255),
  renewal_type VARCHAR(50),
  notice_period INTEGER DEFAULT 0,
  renewal_reminder INTEGER DEFAULT 30,
  internal_owner VARCHAR(255),
  linked_assets TEXT[] DEFAULT '{}',
  linked_licenses TEXT[] DEFAULT '{}',
  linked_pos TEXT[] DEFAULT '{}',
  documents TEXT[] DEFAULT '{}',
  notes TEXT ,
  orgid varchar(128),
  createdat  TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updatedat  TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id varchar(128)
);



-- table purchase_orders
CREATE TABLE purchase_orders (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id VARCHAR(32) UNIQUE NOT NULL,
    -- Business ID: PO-XXX-YYY-ZZZZZ
    vendor_uuid UUID NOT NULL REFERENCES vendors(uuid),
    department VARCHAR(255),
    site_uuid UUID NOT NULL REFERENCES sites(uuid),
    owner_requester_id VARCHAR(128),
    status varchar(255) NOT NULL DEFAULT 'DRAFT',
    -- Purchase details (single-line PO for V1)
    category VARCHAR(255),
    manufacturer_uuid UUID REFERENCES manufacturers(uuid),
    model VARCHAR(255),
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_cost NUMERIC(12,2) NOT NULL CHECK (unit_cost >= 0),
    total_value NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
    purchase_date DATE,
    warranty_expiry DATE,
    -- Receiving tracking (for V1)
    quantity_received INT NOT NULL DEFAULT 0 CHECK (quantity_received >= 0),
  	orgid varchar(128),
	createdat  TIMESTAMP WITH TIME ZONE DEFAULT now(),
	updatedat  TIMESTAMP WITH TIME ZONE DEFAULT now(),
	user_id varchar(128),
    CONSTRAINT qty_received_lte_ordered CHECK (quantity_received <= quantity)
);

-- Activity Logs Table (Append-only audit trail)
DROP TABLE IF EXISTS activity_logs;
CREATE TABLE IF NOT EXISTS activity_logs (
    -- Primary key
    event_id        TEXT PRIMARY KEY DEFAULT 'evt_' || gen_random_uuid()::text,
    -- Timestamp (always UTC)
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Scope
    orgid           VARCHAR(128) NOT NULL,
    org_name        TEXT,
    team_id         TEXT,
    team_name       TEXT,
    -- Classification
    module          TEXT NOT NULL,        -- core | alerts | ams | ipam | system
    category        TEXT NOT NULL,        -- security | governance | operational | config | automation | billing
    severity        TEXT NOT NULL DEFAULT 'info',    -- info | warning | critical
    outcome         TEXT NOT NULL DEFAULT 'success', -- success | failed | denied | partial | pending
    -- Actor (who did it)
    actor_type      TEXT NOT NULL DEFAULT 'user',    -- user | service_account | integration | system
    actor_id        TEXT NOT NULL,
    actor_display   TEXT NOT NULL,        -- human-readable name
    -- Event
    event_type      TEXT NOT NULL,        -- stable code e.g. LOGIN_SUCCESS, ASSET_CREATED
    event_label     TEXT NOT NULL,        -- friendly label e.g. "Login Success"
    -- Target (what was acted upon)
    target_type     TEXT,                -- user | org | asset | incident | vrf | ip_address | etc.
    target_id       TEXT,
    target_display  TEXT,
    -- Source
    source          TEXT,                -- web | mobile | api | webhook | email | sms | system
    ip_address      INET,               -- use INET type for proper IP validation
    user_agent      TEXT,
    request_id      TEXT,
    correlation_id  TEXT,
    -- Payload
    metadata        JSONB,              -- arbitrary event data
    changes         JSONB,              -- { "old": {...}, "new": {...} } for diffs
    -- Immutability: no updated_at column, logs are append-only
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for query performance
CREATE INDEX idx_activity_logs_orgid_ts
    ON activity_logs (orgid, timestamp DESC);

CREATE INDEX idx_activity_logs_module
    ON activity_logs (module, timestamp DESC);

CREATE INDEX idx_activity_logs_category
    ON activity_logs (category, timestamp DESC);

CREATE INDEX idx_activity_logs_severity
    ON activity_logs (severity, timestamp DESC);

CREATE INDEX idx_activity_logs_event_type
    ON activity_logs (event_type, timestamp DESC);

CREATE INDEX idx_activity_logs_actor
    ON activity_logs (actor_id, timestamp DESC);

CREATE INDEX idx_activity_logs_target_type
    ON activity_logs (target_type, timestamp DESC) WHERE target_type IS NOT NULL;

CREATE INDEX idx_activity_logs_outcome
    ON activity_logs (outcome, timestamp DESC);

CREATE INDEX idx_activity_logs_source
    ON activity_logs (source, timestamp DESC) WHERE source IS NOT NULL;

CREATE INDEX idx_activity_logs_request_id
    ON activity_logs (request_id) WHERE request_id IS NOT NULL;

CREATE INDEX idx_activity_logs_correlation_id
    ON activity_logs (correlation_id) WHERE correlation_id IS NOT NULL;

-- Full-text search index (for target/actor search)
CREATE INDEX idx_activity_logs_search
    ON activity_logs USING gin (
        to_tsvector('english',
            COALESCE(actor_display, '') || ' ' ||
            COALESCE(target_display, '') || ' ' ||
            COALESCE(target_id, '')
        )
    );

-- Immutability Trigger
CREATE OR REPLACE FUNCTION prevent_activity_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Activity logs are immutable. UPDATE and DELETE are not allowed.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_activity_logs_immutable
    BEFORE UPDATE OR DELETE ON activity_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_activity_log_mutation();