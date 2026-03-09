const db = require('../../db');

const PRIVATE_RANGES = `(
  ip <<= '10.0.0.0/8'::inet OR
  ip <<= '172.16.0.0/12'::inet OR
  ip <<= '192.168.0.0/16'::inet
)`;

async function getSummary(req, res, next) {
  const orgid = req.orgid;
  try {
    const [
      kpisResult,
      ipTypesResult,
      ipUtilResult,
      trendsResult,
      vlansByStatusResult,
      ipActivityResult,
      sitesSummaryResult,
      prefixHealthResult,
    ] = await Promise.all([
      // KPIs: counts for each resource
      db.query(
        `SELECT
          (SELECT COUNT(*) FROM networks  WHERE orgid = $1) AS prefixes,
          (SELECT COUNT(*) FROM subnets   WHERE orgid = $1) AS subnets,
          (SELECT COUNT(*) FROM devices   WHERE orgid = $1) AS devices,
          (SELECT COUNT(*) FROM racks     WHERE orgid = $1) AS racks,
          (SELECT COUNT(*) FROM vlans     WHERE orgid = $1) AS vlans,
          (SELECT COUNT(*) FROM vrfs      WHERE orgid = $1) AS vrfs,
          (SELECT COUNT(*) FROM sites     WHERE orgid = $1) AS sites`,
        [orgid]
      ),

      // Public / private IP counts
      db.query(
        `SELECT
          COUNT(*) FILTER (WHERE ${PRIVATE_RANGES})                     AS private_ips,
          COUNT(*) FILTER (WHERE NOT (${PRIVATE_RANGES}))               AS public_ips,
          COUNT(*)                                                        AS ip_addresses
         FROM ips WHERE orgid = $1`,
        [orgid]
      ),

      // IP utilization: non-available / total
      db.query(
        `SELECT
          COUNT(*) FILTER (WHERE status != 'available') AS allocated,
          COUNT(*)                                       AS total
         FROM ips WHERE orgid = $1`,
        [orgid]
      ),

      // Trends: % change vs 30 days ago
      db.query(
        `SELECT
          (SELECT COUNT(*) FROM networks WHERE orgid = $1)                                             AS prefixes_now,
          (SELECT COUNT(*) FROM networks WHERE orgid = $1 AND createdat < NOW() - INTERVAL '30 days') AS prefixes_30d,
          (SELECT COUNT(*) FROM subnets  WHERE orgid = $1)                                             AS subnets_now,
          (SELECT COUNT(*) FROM subnets  WHERE orgid = $1 AND createdat < NOW() - INTERVAL '30 days') AS subnets_30d,
          (SELECT COUNT(*) FROM devices  WHERE orgid = $1)                                             AS devices_now,
          (SELECT COUNT(*) FROM devices  WHERE orgid = $1 AND createdat < NOW() - INTERVAL '30 days') AS devices_30d,
          (SELECT COUNT(*) FROM racks    WHERE orgid = $1)                                             AS racks_now,
          (SELECT COUNT(*) FROM racks    WHERE orgid = $1 AND createdat < NOW() - INTERVAL '30 days') AS racks_30d,
          (SELECT COUNT(*) FROM vlans    WHERE orgid = $1)                                             AS vlans_now,
          (SELECT COUNT(*) FROM vlans    WHERE orgid = $1 AND createdat < NOW() - INTERVAL '30 days') AS vlans_30d,
          (SELECT COUNT(*) FROM vrfs     WHERE orgid = $1)                                             AS vrfs_now,
          (SELECT COUNT(*) FROM vrfs     WHERE orgid = $1 AND createdat < NOW() - INTERVAL '30 days') AS vrfs_30d`,
        [orgid]
      ),

      // VLANs by status
      db.query(
        `SELECT status, COUNT(*) AS count
         FROM vlans WHERE orgid = $1
         GROUP BY status ORDER BY count DESC`,
        [orgid]
      ),

      // IP activity last 7 days (allocated per day; no delete tracking so released = 0)
      db.query(
        `SELECT
          DATE(createdat AT TIME ZONE 'UTC') AS date,
          COUNT(*)                            AS allocated
         FROM ips
         WHERE orgid = $1
           AND createdat >= NOW() - INTERVAL '7 days'
         GROUP BY DATE(createdat AT TIME ZONE 'UTC')
         ORDER BY date`,
        [orgid]
      ),

      // Sites summary — aggregate linked resources per site
      db.query(
        `SELECT
          s.uuid,
          s.name,
          NULL::numeric                              AS lat,
          NULL::numeric                              AS lng,
          COUNT(DISTINCT n.uuid)                     AS prefixes,
          COUNT(DISTINCT sub.uuid)                   AS subnets,
          COUNT(DISTINCT i.uuid) FILTER (WHERE ${PRIVATE_RANGES.replace(/\bip\b/g, 'i.ip')})       AS private_ips,
          COUNT(DISTINCT i.uuid) FILTER (WHERE NOT (${PRIVATE_RANGES.replace(/\bip\b/g, 'i.ip')})) AS public_ips,
          COUNT(DISTINCT d.uuid)                     AS devices,
          COUNT(DISTINCT r.uuid)                     AS racks,
          0                                          AS vlans,
          0                                          AS vrfs
         FROM sites s
         LEFT JOIN networks  n   ON n.site_uuid  = s.uuid AND n.orgid  = $1
         LEFT JOIN subnets   sub ON sub.site_uuid = s.uuid AND sub.orgid = $1
         LEFT JOIN ips       i   ON i.subnets_uuid = sub.uuid
         LEFT JOIN devices   d   ON d.site_uuid  = s.uuid AND d.orgid  = $1
         LEFT JOIN racks     r   ON r.site_uuid  = s.uuid AND r.orgid  = $1
         WHERE s.orgid = $1
         GROUP BY s.uuid, s.name
         ORDER BY s.name`,
        [orgid]
      ),

      // Prefix health: top 10 by usage
      db.query(
        `SELECT
          n.prefix::text                                                                                    AS prefix,
          COUNT(i.uuid) FILTER (WHERE NOT (${PRIVATE_RANGES.replace(/\bip\b/g, 'i.ip')}))                 AS used_public,
          COUNT(i.uuid) FILTER (WHERE ${PRIVATE_RANGES.replace(/\bip\b/g, 'i.ip')})                        AS used_private,
          GREATEST(
            (power(2, 32 - masklen(n.prefix)) - 2)::bigint - COUNT(i.uuid)::bigint,
            0
          )                                                                                                 AS free
         FROM networks n
         LEFT JOIN subnets sub ON sub.networks_uuid = n.uuid
         LEFT JOIN ips     i   ON i.subnets_uuid    = sub.uuid
         WHERE n.orgid = $1
         GROUP BY n.uuid, n.prefix
         ORDER BY COUNT(i.uuid) DESC
         LIMIT 10`,
        [orgid]
      ),
    ]);

    // ── KPIs ──────────────────────────────────────────────────────────────────
    const k = kpisResult.rows[0];
    const ip = ipTypesResult.rows[0];
    const util = ipUtilResult.rows[0];
    const totalIps = parseInt(util.total, 10);
    const allocatedIps = parseInt(util.allocated, 10);

    const kpis = {
      prefixes:      parseInt(k.prefixes, 10),
      subnets:       parseInt(k.subnets, 10),
      public_ips:    parseInt(ip.public_ips, 10),
      private_ips:   parseInt(ip.private_ips, 10),
      devices:       parseInt(k.devices, 10),
      racks:         parseInt(k.racks, 10),
      vlans:         parseInt(k.vlans, 10),
      vrfs:          parseInt(k.vrfs, 10),
      sites:         parseInt(k.sites, 10),
      ip_addresses:  parseInt(ip.ip_addresses, 10),
      utilization_pct: totalIps > 0 ? parseFloat((allocatedIps / totalIps).toFixed(4)) : 0,
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
      prefixes:    pct(t.prefixes_now,  t.prefixes_30d),
      subnets:     pct(t.subnets_now,   t.subnets_30d),
      public_ips:  null, // no per-type trend without historical type split
      private_ips: null,
      devices:     pct(t.devices_now,   t.devices_30d),
      racks:       pct(t.racks_now,     t.racks_30d),
      vlans:       pct(t.vlans_now,     t.vlans_30d),
      vrfs:        pct(t.vrfs_now,      t.vrfs_30d),
    };

    // ── VLANs by status ───────────────────────────────────────────────────────
    const vlans_by_status = vlansByStatusResult.rows.map(r => ({
      status: r.status,
      count:  parseInt(r.count, 10),
    }));

    // ── VRFs by status (no status column — treat all as active) ───────────────
    const vrfs_by_status = [
      { status: 'active', count: kpis.vrfs },
    ];

    // ── IP activity last 7 days ───────────────────────────────────────────────
    const ip_activity_7d = ipActivityResult.rows.map(r => ({
      date:      r.date instanceof Date
                   ? r.date.toISOString().slice(0, 10)
                   : String(r.date),
      allocated: parseInt(r.allocated, 10),
      released:  0,
    }));

    // ── Sites summary ─────────────────────────────────────────────────────────
    const sites_summary = sitesSummaryResult.rows.map(r => ({
      uuid:        r.uuid,
      name:        r.name,
      lat:         r.lat !== null ? parseFloat(r.lat) : null,
      lng:         r.lng !== null ? parseFloat(r.lng) : null,
      prefixes:    parseInt(r.prefixes, 10),
      subnets:     parseInt(r.subnets, 10),
      public_ips:  parseInt(r.public_ips, 10),
      private_ips: parseInt(r.private_ips, 10),
      devices:     parseInt(r.devices, 10),
      racks:       parseInt(r.racks, 10),
      vlans:       parseInt(r.vlans, 10),
      vrfs:        parseInt(r.vrfs, 10),
    }));

    // ── Prefix health ─────────────────────────────────────────────────────────
    const prefix_health = prefixHealthResult.rows.map(r => ({
      prefix:       r.prefix,
      used_public:  parseInt(r.used_public, 10),
      used_private: parseInt(r.used_private, 10),
      free:         parseInt(r.free, 10),
    }));

    res.json({
      kpis,
      trends,
      vlans_by_status,
      vrfs_by_status,
      ip_activity_7d,
      sites_summary,
      prefix_health,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getSummary };
