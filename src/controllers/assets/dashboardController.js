const db = require('../../db');

async function getSummary(req, res, next) {
  const orgid = req.orgid;
  try {
    const [
      kpisResult,
      trendsResult,
      assetsByStatusResult,
      assetsByCategoryResult,
      posByStatusResult,
      contractsByStatusResult,
      assetActivityResult,
      spendByCategoryResult,
      topVendorsResult,
      sitesSummaryResult,
    ] = await Promise.all([
      // KPIs
      db.query(
        `SELECT
          (SELECT COUNT(*)                    FROM assets          WHERE orgid = $1) AS total_assets,
          (SELECT COUNT(*)                    FROM purchase_orders WHERE orgid = $1) AS total_pos,
          (SELECT COUNT(*)                    FROM vendors         WHERE orgid = $1) AS total_vendors,
          (SELECT COUNT(*)                    FROM contracts       WHERE orgid = $1) AS total_contracts,
          (SELECT COALESCE(SUM(purchase_cost),0) FROM assets       WHERE orgid = $1) AS total_asset_value,
          (SELECT COALESCE(SUM(total_value),0)   FROM purchase_orders WHERE orgid = $1) AS total_po_value,
          (SELECT COALESCE(SUM(value),0)         FROM contracts    WHERE orgid = $1) AS total_contract_value,
          (SELECT COUNT(*) FROM assets WHERE orgid = $1
            AND warranty_expiry BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') AS warranty_expiring_30d,
          (SELECT COUNT(*) FROM assets WHERE orgid = $1
            AND expected_eol BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days')   AS eol_upcoming_90d`,
        [orgid]
      ),

      // Trends: % change vs 30 days ago
      db.query(
        `SELECT
          (SELECT COUNT(*) FROM assets          WHERE orgid = $1)                                             AS assets_now,
          (SELECT COUNT(*) FROM assets          WHERE orgid = $1 AND createdat < NOW() - INTERVAL '30 days') AS assets_30d,
          (SELECT COUNT(*) FROM purchase_orders WHERE orgid = $1)                                             AS pos_now,
          (SELECT COUNT(*) FROM purchase_orders WHERE orgid = $1 AND createdat < NOW() - INTERVAL '30 days') AS pos_30d,
          (SELECT COUNT(*) FROM vendors         WHERE orgid = $1)                                             AS vendors_now,
          (SELECT COUNT(*) FROM vendors         WHERE orgid = $1 AND createdat < NOW() - INTERVAL '30 days') AS vendors_30d,
          (SELECT COUNT(*) FROM contracts       WHERE orgid = $1)                                             AS contracts_now,
          (SELECT COUNT(*) FROM contracts       WHERE orgid = $1 AND createdat < NOW() - INTERVAL '30 days') AS contracts_30d`,
        [orgid]
      ),

      // Assets by status
      db.query(
        `SELECT status, COUNT(*) AS count
         FROM assets WHERE orgid = $1
         GROUP BY status ORDER BY count DESC`,
        [orgid]
      ),

      // Assets by category
      db.query(
        `SELECT COALESCE(category, 'Uncategorized') AS category, COUNT(*) AS count
         FROM assets WHERE orgid = $1
         GROUP BY category ORDER BY count DESC`,
        [orgid]
      ),

      // Purchase orders by status
      db.query(
        `SELECT status, COUNT(*) AS count, COALESCE(SUM(total_value), 0) AS total_value
         FROM purchase_orders WHERE orgid = $1
         GROUP BY status ORDER BY count DESC`,
        [orgid]
      ),

      // Contracts by status
      db.query(
        `SELECT status, COUNT(*) AS count, COALESCE(SUM(value), 0) AS total_value
         FROM contracts WHERE orgid = $1
         GROUP BY status ORDER BY count DESC`,
        [orgid]
      ),

      // Asset activity last 7 days
      db.query(
        `SELECT
          DATE(createdat AT TIME ZONE 'UTC') AS date,
          COUNT(*)                            AS created
         FROM assets
         WHERE orgid = $1
           AND createdat >= NOW() - INTERVAL '7 days'
         GROUP BY DATE(createdat AT TIME ZONE 'UTC')
         ORDER BY date`,
        [orgid]
      ),

      // Spend by category
      db.query(
        `SELECT
          COALESCE(category, 'Uncategorized')   AS category,
          COALESCE(SUM(purchase_cost), 0)        AS total_cost,
          COUNT(*)                               AS asset_count
         FROM assets WHERE orgid = $1
         GROUP BY category ORDER BY total_cost DESC`,
        [orgid]
      ),

      // Top vendors by PO value
      db.query(
        `SELECT
          v.uuid                              AS vendor_uuid,
          v.name                              AS vendor_name,
          COUNT(DISTINCT po.uuid)             AS po_count,
          COALESCE(SUM(po.total_value), 0)    AS total_po_value,
          COUNT(DISTINCT a.uuid)              AS asset_count
         FROM vendors v
         LEFT JOIN purchase_orders po ON po.vendor_uuid = v.uuid AND po.orgid = $1
         LEFT JOIN assets a           ON a.purchase_order_uuid = po.uuid
         WHERE v.orgid = $1
         GROUP BY v.uuid, v.name
         ORDER BY total_po_value DESC
         LIMIT 10`,
        [orgid]
      ),

      // Sites summary
      db.query(
        `SELECT
          s.uuid                                                   AS site_uuid,
          s.name                                                   AS site_name,
          COUNT(DISTINCT a.uuid)                                   AS asset_count,
          COUNT(DISTINCT a.uuid) FILTER (WHERE a.status = 'Active') AS active_count,
          COALESCE(SUM(a.purchase_cost), 0)                        AS total_asset_value,
          COUNT(DISTINCT po.uuid)                                  AS po_count
         FROM sites s
         LEFT JOIN assets          a  ON a.site_uuid  = s.uuid AND a.orgid  = $1
         LEFT JOIN purchase_orders po ON po.site_uuid = s.uuid AND po.orgid = $1
         WHERE s.orgid = $1
         GROUP BY s.uuid, s.name
         ORDER BY asset_count DESC`,
        [orgid]
      ),
    ]);

    // ── KPIs ──────────────────────────────────────────────────────────────────
    const k = kpisResult.rows[0];
    const kpis = {
      total_assets:          parseInt(k.total_assets, 10),
      total_pos:             parseInt(k.total_pos, 10),
      total_vendors:         parseInt(k.total_vendors, 10),
      total_contracts:       parseInt(k.total_contracts, 10),
      total_asset_value:     parseFloat(k.total_asset_value),
      total_po_value:        parseFloat(k.total_po_value),
      total_contract_value:  parseFloat(k.total_contract_value),
      warranty_expiring_30d: parseInt(k.warranty_expiring_30d, 10),
      eol_upcoming_90d:      parseInt(k.eol_upcoming_90d, 10),
    };

    // ── Trends ────────────────────────────────────────────────────────────────
    const t = trendsResult.rows[0];
    const pct = (now, past) => {
      const n = parseInt(now, 10);
      const p = parseInt(past, 10);
      if (p === 0) return n > 0 ? 100.0 : 0.0;
      return parseFloat((((n - p) / p) * 100).toFixed(1));
    };
    const trends = {
      assets:    pct(t.assets_now,    t.assets_30d),
      pos:       pct(t.pos_now,       t.pos_30d),
      vendors:   pct(t.vendors_now,   t.vendors_30d),
      contracts: pct(t.contracts_now, t.contracts_30d),
    };

    // ── Assets by status ──────────────────────────────────────────────────────
    const assets_by_status = assetsByStatusResult.rows.map(r => ({
      status: r.status,
      count:  parseInt(r.count, 10),
    }));

    // ── Assets by category ────────────────────────────────────────────────────
    const assets_by_category = assetsByCategoryResult.rows.map(r => ({
      category: r.category,
      count:    parseInt(r.count, 10),
    }));

    // ── POs by status ─────────────────────────────────────────────────────────
    const pos_by_status = posByStatusResult.rows.map(r => ({
      status:      r.status,
      count:       parseInt(r.count, 10),
      total_value: parseFloat(r.total_value),
    }));

    // ── Contracts by status ───────────────────────────────────────────────────
    const contracts_by_status = contractsByStatusResult.rows.map(r => ({
      status:      r.status,
      count:       parseInt(r.count, 10),
      total_value: parseFloat(r.total_value),
    }));

    // ── Asset activity last 7 days ────────────────────────────────────────────
    const asset_activity_7d = assetActivityResult.rows.map(r => ({
      date:    r.date instanceof Date
                 ? r.date.toISOString().slice(0, 10)
                 : String(r.date),
      created: parseInt(r.created, 10),
    }));

    // ── Spend by category ─────────────────────────────────────────────────────
    const spend_by_category = spendByCategoryResult.rows.map(r => ({
      category:    r.category,
      total_cost:  parseFloat(r.total_cost),
      asset_count: parseInt(r.asset_count, 10),
    }));

    // ── Top vendors ───────────────────────────────────────────────────────────
    const top_vendors = topVendorsResult.rows.map(r => ({
      vendor_uuid:    r.vendor_uuid,
      vendor_name:    r.vendor_name,
      po_count:       parseInt(r.po_count, 10),
      total_po_value: parseFloat(r.total_po_value),
      asset_count:    parseInt(r.asset_count, 10),
    }));

    // ── Sites summary ─────────────────────────────────────────────────────────
    const sites_summary = sitesSummaryResult.rows.map(r => ({
      site_uuid:         r.site_uuid,
      site_name:         r.site_name,
      asset_count:       parseInt(r.asset_count, 10),
      active_count:      parseInt(r.active_count, 10),
      total_asset_value: parseFloat(r.total_asset_value),
      po_count:          parseInt(r.po_count, 10),
    }));

    res.json({
      kpis,
      trends,
      assets_by_status,
      assets_by_category,
      pos_by_status,
      contracts_by_status,
      asset_activity_7d,
      spend_by_category,
      top_vendors,
      sites_summary,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getSummary };
