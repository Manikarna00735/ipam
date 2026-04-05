-- Migration 002: Database Index Audit
-- Adds missing indexes for performance at scale.
--
-- Tables with unique(orgid, slug) already have a btree index with orgid as the
-- leading column (PostgreSQL indexes unique constraints automatically), so a
-- standalone orgid index on those tables would be redundant.
--
-- Tables covered by unique(orgid, slug):
--   providers, regions, sites, locations, manufacturers, platforms, racks
--
-- All other tables need an explicit orgid index.
-- All foreign key columns also need indexes (none were present).

-- ── orgid indexes ──────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_vlans_orgid
    ON vlans (orgid);

CREATE INDEX IF NOT EXISTS idx_vrfs_orgid
    ON vrfs (orgid);

CREATE INDEX IF NOT EXISTS idx_wireless_orgid
    ON wireless (orgid);

CREATE INDEX IF NOT EXISTS idx_interfaces_orgid
    ON interfaces (orgid);

CREATE INDEX IF NOT EXISTS idx_circuits_orgid
    ON circuits (orgid);

CREATE INDEX IF NOT EXISTS idx_networks_orgid
    ON networks (orgid);

CREATE INDEX IF NOT EXISTS idx_subnets_orgid
    ON subnets (orgid);

CREATE INDEX IF NOT EXISTS idx_ips_orgid
    ON ips (orgid);

CREATE INDEX IF NOT EXISTS idx_vendors_orgid
    ON vendors (orgid);

CREATE INDEX IF NOT EXISTS idx_contracts_orgid
    ON contracts (orgid);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_orgid
    ON purchase_orders (orgid);

CREATE INDEX IF NOT EXISTS idx_assets_orgid
    ON assets (orgid);

-- ── Foreign key indexes ────────────────────────────────────────────────────

-- locations
CREATE INDEX IF NOT EXISTS idx_locations_site_uuid
    ON locations (site_uuid);

-- racks
CREATE INDEX IF NOT EXISTS idx_racks_site_uuid
    ON racks (site_uuid);

CREATE INDEX IF NOT EXISTS idx_racks_location_uuid
    ON racks (location_uuid);

-- platforms
CREATE INDEX IF NOT EXISTS idx_platforms_manufacturer_uuid
    ON platforms (manufacturer_uuid);

-- devices
CREATE INDEX IF NOT EXISTS idx_devices_site_uuid
    ON devices (site_uuid);

CREATE INDEX IF NOT EXISTS idx_devices_manufacturer_uuid
    ON devices (manufacturer_uuid);

CREATE INDEX IF NOT EXISTS idx_devices_platform_uuid
    ON devices (platform_uuid);

CREATE INDEX IF NOT EXISTS idx_devices_rack_uuid
    ON devices (rack_uuid);

CREATE INDEX IF NOT EXISTS idx_devices_location_uuid
    ON devices (location_uuid);

-- interfaces
CREATE INDEX IF NOT EXISTS idx_interfaces_device_uuid
    ON interfaces (device_uuid);

CREATE INDEX IF NOT EXISTS idx_interfaces_vrf_uuid
    ON interfaces (vrf_uuid);

-- wireless
CREATE INDEX IF NOT EXISTS idx_wireless_vlan_uuid
    ON wireless (vlan_uuid);

-- circuits
CREATE INDEX IF NOT EXISTS idx_circuits_provider_uuid
    ON circuits (provider_uuid);

-- networks (prefixes)
CREATE INDEX IF NOT EXISTS idx_networks_site_uuid
    ON networks (site_uuid);

CREATE INDEX IF NOT EXISTS idx_networks_vrf_uuid
    ON networks (vrf_uuid);

CREATE INDEX IF NOT EXISTS idx_networks_vlan_uuid
    ON networks (vlan_uuid);

-- subnets
CREATE INDEX IF NOT EXISTS idx_subnets_networks_uuid
    ON subnets (networks_uuid);

CREATE INDEX IF NOT EXISTS idx_subnets_site_uuid
    ON subnets (site_uuid);

CREATE INDEX IF NOT EXISTS idx_subnets_vrf_uuid
    ON subnets (vrf_uuid);

CREATE INDEX IF NOT EXISTS idx_subnets_vlan_uuid
    ON subnets (vlan_uuid);

-- ips
CREATE INDEX IF NOT EXISTS idx_ips_subnets_uuid
    ON ips (subnets_uuid);

CREATE INDEX IF NOT EXISTS idx_ips_vrf_uuid
    ON ips (vrf_uuid);

CREATE INDEX IF NOT EXISTS idx_ips_vlan_uuid
    ON ips (vlan_uuid);

-- contracts
CREATE INDEX IF NOT EXISTS idx_contracts_vendor_uuid
    ON contracts (vendor_uuid);

-- purchase_orders
CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor_uuid
    ON purchase_orders (vendor_uuid);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_site_uuid
    ON purchase_orders (site_uuid);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_manufacturer_uuid
    ON purchase_orders (manufacturer_uuid);

-- assets
CREATE INDEX IF NOT EXISTS idx_assets_site_uuid
    ON assets (site_uuid);

CREATE INDEX IF NOT EXISTS idx_assets_manufacturer_uuid
    ON assets (manufacturer_uuid);

CREATE INDEX IF NOT EXISTS idx_assets_purchase_order_uuid
    ON assets (purchase_order_uuid);

-- ── Composite indexes (common multi-column filter patterns) ────────────────

-- assets filtered by org + status (e.g. "show all Active assets for this org")
CREATE INDEX IF NOT EXISTS idx_assets_orgid_status
    ON assets (orgid, status);

-- IPs filtered by subnet + status (e.g. "available IPs in this subnet")
CREATE INDEX IF NOT EXISTS idx_ips_subnets_uuid_status
    ON ips (subnets_uuid, status);

-- purchase orders filtered by org + status (e.g. "all RECEIVED POs for this org")
CREATE INDEX IF NOT EXISTS idx_purchase_orders_orgid_status
    ON purchase_orders (orgid, status);
