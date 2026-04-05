-- Migration 003: Soft Deletes
-- Adds deleted_at column to all entity tables.
-- Rows are "deleted" by setting deleted_at = NOW() instead of being removed.

ALTER TABLE vlans          ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE vrfs           ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE devices        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE sites          ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE racks          ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE locations      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE circuits       ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE interfaces     ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE providers      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE manufacturers  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE platforms      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE regions        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE wireless       ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE networks       ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE subnets        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE ips            ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE vendors        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE contracts      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE assets         ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Partial indexes on deleted_at IS NULL — covers the common "active records" filter
CREATE INDEX IF NOT EXISTS idx_vlans_deleted_at          ON vlans          (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vrfs_deleted_at           ON vrfs           (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_devices_deleted_at        ON devices        (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sites_deleted_at          ON sites          (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_racks_deleted_at          ON racks          (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_locations_deleted_at      ON locations      (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_circuits_deleted_at       ON circuits       (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_interfaces_deleted_at     ON interfaces     (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_providers_deleted_at      ON providers      (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_manufacturers_deleted_at  ON manufacturers  (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_platforms_deleted_at      ON platforms      (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_regions_deleted_at        ON regions        (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wireless_deleted_at       ON wireless       (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_networks_deleted_at       ON networks       (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_subnets_deleted_at        ON subnets        (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ips_deleted_at            ON ips            (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vendors_deleted_at        ON vendors        (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_deleted_at      ON contracts      (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_orders_deleted_at ON purchase_orders (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_assets_deleted_at         ON assets         (deleted_at) WHERE deleted_at IS NULL;
