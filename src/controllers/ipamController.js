const db = require('../db');
const { Address4, Address6 } = require('ip-address');
const realtime = require('../realtime');
const common = require('../common');

// Helper function to check if two IP ranges overlap
function checkRangesOverlap(range1, range2) {
  try {
    let addr1, addr2;
    
    // Parse both ranges
    if (range1.includes(':')) {
      addr1 = new Address6(range1);
      addr2 = new Address6(range2);
    } else {
      addr1 = new Address4(range1);
      addr2 = new Address4(range2);
    }
    
    // Check if one contains the other (full overlap)
    if (addr1.isInSubnet(addr2) || addr2.isInSubnet(addr1)) {
      return true;
    }
    
    // Check for partial overlap by comparing start/end addresses
    const start1 = addr1.startAddress();
    const end1 = addr1.endAddress();
    const start2 = addr2.startAddress();
    const end2 = addr2.endAddress();
    
    // Convert to BigInt for comparison
    const start1Big = start1.bigInt();
    const end1Big = end1.bigInt();
    const start2Big = start2.bigInt();
    const end2Big = end2.bigInt();
    
    // Check if ranges intersect: range1 overlaps range2 if:
    // start1 <= end2 AND start2 <= end1
    return (start1Big <= end2Big && start2Big <= end1Big);
  } catch (err) {
    // If parsing fails, assume no overlap (shouldn't happen if validation passed)
    return false;
  }
}

// ==================== PREFIXES (networks) ====================

async function createPrefix(req, res, next) {
  try {
    const p = req.body || {};

    // Validate IP prefix format
    try {
      const prefixStr = p.prefix.includes('/') ? p.prefix : `${p.prefix}/32`;
      if (prefixStr.includes(':')) {
        new Address6(prefixStr);
      } else {
        new Address4(prefixStr);
      }
    } catch (err) {
      return res.status(400).json({ error: 'invalid prefix format' });
    }

    // Check if prefix already exists in the database for this org
    const existingPrefix = await db.query(
      'SELECT * FROM networks WHERE prefix = $1 AND orgid = $2',
      [p.prefix, req.orgid]
    );
    if (existingPrefix.rows.length > 0) {
      return res.status(409).json({ error: 'prefix already exists in this organization' });
    }

    // Check for overlapping prefixes in the database for this org
    const allPrefixes = await db.query(
      'SELECT prefix FROM networks WHERE orgid = $1',
      [req.orgid]
    );
    for (const existing of allPrefixes.rows) {
      if (checkRangesOverlap(p.prefix, existing.prefix)) {
        return res.status(409).json({ 
          error: `prefix overlaps with existing prefix: ${existing.prefix}` 
        });
      }
    }

    const sql = `INSERT INTO networks (
      prefix, site_uuid, vrf_uuid, vlan_uuid, role, tags, tenant, tenantgroup,
      orgid, status, user_id, updatedat
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, current_timestamp) RETURNING *`;
    
    const values = [
      p.prefix,
      p.site_uuid,
      p.vrf_uuid,
      p.vlan_uuid,
      p.role,
      p.tags || null,
      p.tenant,
      p.tenantgroup || null,
      req.orgid || null,
      p.status,
      req.user?.user_id || null
    ];

    const result = await db.query(sql, values);
    const createdPrefix = result.rows[0];
    
    // Emit real-time event
    realtime.emit('prefixes:created', createdPrefix);
    
    res.status(201).json(createdPrefix);
  } catch (err) { next(err); }
}

async function listPrefixes(req, res, next) {
  try {
    const rows = (await db.query(`SELECT ns.uuid, ns.prefix, json_build_object('uuid', ns.site_uuid, 'name', s.name) as site, 
      json_build_object('uuid', ns.vrf_uuid, 'name', v.name) as vrf,
      json_build_object('uuid', ns.vlan_uuid, 'name', l.name) as vlan,
      ns.role, ns.tags, ns.tenant, ns.tenantgroup, ns.orgid, ns.status, ns.createdat, ns.updatedat, 
      ns.user_id
      FROM networks ns
      left outer join sites s on ns.site_uuid = s.uuid
      left outer join vrfs v on ns.vrf_uuid = v.uuid
      left outer join vlans l on ns.vlan_uuid = l.uuid
      WHERE ns.orgid = $1 ORDER BY ns.prefix`, [req.orgid])).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function getPrefix(req, res, next) {
  try {
    const rows = (await db.query(`SELECT ns.uuid, ns.prefix, json_build_object('uuid', ns.site_uuid, 'name', s.name) as site, 
      json_build_object('uuid', ns.vrf_uuid, 'name', v.name) as vrf,
      json_build_object('uuid', ns.vlan_uuid, 'name', l.name) as vlan,
      ns.role, ns.tags, ns.tenant, ns.tenantgroup, ns.orgid, ns.status, ns.createdat, ns.updatedat, 
      ns.user_id
      FROM networks ns
      left outer join sites s on ns.site_uuid = s.uuid
      left outer join vrfs v on ns.vrf_uuid = v.uuid
      left outer join vlans l on ns.vlan_uuid = l.uuid
      WHERE ns.orgid = $1 AND ns.uuid = $2 ORDER BY ns.prefix`, [req.orgid, req.params.id])).rows;
    if (rows.length === 0) {
      return res.status(404).json({ error: 'not found' });
    }
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function updatePrefix(req, res, next) {
  try {
    const id = req.params.id;
    const payload = req.body || {};
    
    const getRes = await db.query('SELECT * FROM networks WHERE uuid = $1', [id]);
    const row = getRes.rows[0];
    if (!row) return res.status(404).json({ error: 'not found' });
    if (row.orgid !== req.orgid) return res.status(403).json({ error: 'org mismatch' });

    // Validate prefix if being updated
    // if (payload.prefix) {
    //   try {
    //     const prefixStr = payload.prefix.includes('/') ? payload.prefix : `${payload.prefix}/32`;
    //     if (prefixStr.includes(':')) {
    //       new Address6(prefixStr);
    //     } else {
    //       new Address4(prefixStr);
    //     }
    //   } catch (err) {
    //     return res.status(400).json({ error: 'invalid prefix format' });
    //   }
    // }

    const allowedKeys = ['site_uuid', 'vrf_uuid', 'vlan_uuid', 'role', 'tags', 'tenant', 'tenantgroup', 'status'];
    const newpayload = await common.allowedUpdateKeys(payload, allowedKeys);

    const keys = Object.keys(newpayload);
    const values = Object.values(newpayload);
    let sql, qValues;
    
    if (keys.length === 0) {
      sql = `UPDATE networks SET updatedat = current_timestamp, user_id = $1 WHERE uuid = $2 RETURNING *`;
      qValues = [req.user?.user_id || null, id];
    } else {
      const setClauses = keys.map((k, i) => `"${k}"=$${i + 1}`).join(', ');
      sql = `UPDATE networks SET ${setClauses}, updatedat = current_timestamp, user_id = $${values.length + 1} WHERE uuid = $${values.length + 2} RETURNING *`;
      qValues = values.concat([req.user?.user_id || null, id]);
    }
    
    const result = await db.query(sql, qValues);
    const updatedPrefix = result.rows[0];
    
    // Emit real-time event
    realtime.emit('prefixes:updated', updatedPrefix);
    
    res.json(updatedPrefix);
  } catch (err) { next(err); }
}

async function deletePrefix(req, res, next) {
  try {
    const id = req.params.id;

    const activeIps = await db.query(`SELECT * FROM ips WHERE subnets_uuid in ( select uuid from subnets where networks_uuid = $1) 
      AND orgid = $2 AND status != 'disabled' `, [id, req.orgid]);
    if (activeIps.rows.length !== 0) {
      return res.status(404).json({ error: 'Cannot delete: This network is currently in use by one or more active IP addresses.' });
    }

    const getRes = await db.query('SELECT * FROM networks WHERE uuid = $1', [id]);
    const row = getRes.rows[0];
    if (!row) return res.status(404).json({ error: 'not found' });
    if (row.orgid !== req.orgid) return res.status(403).json({ error: 'org mismatch' });
    
    await db.query('DELETE FROM networks WHERE uuid = $1', [id]);
    
    // Emit real-time event
    realtime.emit('prefixes:deleted', { id, org_id: req.orgid });
    
    res.status(204).send();
  } catch (err) { next(err); }
}

// ==================== SUBNETS ====================

// Helper function to auto-generate all IPs for a subnet
async function autoGenerateIPsForSubnet(subnetId, subnetCidr, orgid, userId) {
  try {
    const subnetAddr = subnetCidr.includes(':') 
      ? new Address6(subnetCidr)
      : new Address4(subnetCidr);
    
    // Get all existing IPs in this subnet
    const existingIPs = await db.query(
      'SELECT ip::text as ip FROM ips WHERE subnets_uuid = $1 AND orgid = $2',
      [subnetId, orgid]
    );
    
    const usedIPs = new Set(existingIPs.rows.map(r => r.ip));
    
    // Get start and end addresses
    const startIP = subnetAddr.startAddress();
    const endIP = subnetAddr.endAddress();
    
    const generatedIPs = [];
    
    // Generate all available IPs
    if (subnetAddr instanceof Address4) {
      // Get BigInt values
      const startBigInt = startIP.bigInt();
      const endBigInt = endIP.bigInt();
      
      // Skip first address (network) and last address (broadcast)
      let currentBigInt = startBigInt + BigInt(1);
      const endBigIntUsable = endBigInt - BigInt(1);
      
      while (currentBigInt <= endBigIntUsable) {
        // Convert BigInt back to Address4
        const currentAddr = Address4.fromBigInt(currentBigInt);
        const ipStr = currentAddr.address;
        
        if (!usedIPs.has(ipStr)) {
          generatedIPs.push(ipStr);
        }
        currentBigInt = currentBigInt + BigInt(1);
      }
    } else {
      // For IPv6, use BigInt arithmetic
      const startBigInt = startIP.bigInt();
      const endBigInt = endIP.bigInt();
      
      // Skip first address (network)
      let currentBigInt = startBigInt + BigInt(1);
      
      while (currentBigInt <= endBigInt) {
        // Convert BigInt back to Address6
        const currentAddr = Address6.fromBigInt(currentBigInt);
        const ipStr = currentAddr.correctForm();
        
        if (!usedIPs.has(ipStr)) {
          generatedIPs.push(ipStr);
        }
        currentBigInt = currentBigInt + BigInt(1);
      }
    }
    
    // Insert all generated IPs
    const results = [];
    for (const ip of generatedIPs) {
      const sql = `INSERT INTO ips (
        subnets_uuid, ip, orgid, status, user_id, updatedat
      ) VALUES ($1, $2, $3, $4, $5, current_timestamp) RETURNING *`;
      
      const values = [
        subnetId,
        ip,
        orgid || null,
        'available',
        userId || null
      ];

      const result = await db.query(sql, values);
      results.push(result.rows[0]);
    }
    
    return results;
  } catch (err) {
    console.error('Error auto-generating IPs:', err);
    // Don't throw, just log - subnet creation should still succeed
    return [];
  }
}

async function createSubnet(req, res, next) {
  try {
    const prefixId = req.params.id;
    const p = req.body || {};
    
    // Verify prefix exists and belongs to org
    const prefixRes = await db.query('SELECT * FROM networks WHERE uuid = $1 AND orgid = $2', [prefixId, req.orgid]);
    if (prefixRes.rows.length === 0) {
      return res.status(404).json({ error: 'prefix not found' });
    }
    const prefix = prefixRes.rows[0];

    // Validate subnet format and ensure it's within the prefix
    try {
      const subnetStr = p.subnet.includes('/') ? p.subnet : `${p.subnet}/32`;
      let subnetAddr, prefixAddr;
      
      if (subnetStr.includes(':')) {
        subnetAddr = new Address6(subnetStr);
        prefixAddr = new Address6(prefix.prefix);
      } else {
        subnetAddr = new Address4(subnetStr);
        prefixAddr = new Address4(prefix.prefix);
      }

      // Check if subnet is within prefix
      if (!subnetAddr.isInSubnet(prefixAddr)) {
        return res.status(400).json({ error: 'subnet must be within the parent prefix' });
      }
    } catch (err) {
      return res.status(400).json({ error: 'invalid subnet format' });
    }

    // Check if subnet already exists in the database for this org
    const existingSubnet = await db.query(
      'SELECT * FROM subnets WHERE subnet = $1 AND orgid = $2',
      [p.subnet, req.orgid]
    );
    if (existingSubnet.rows.length > 0) {
      return res.status(409).json({ error: 'subnet already exists in this organization' });
    }

    // Check for overlapping subnets in the database for this org
    const allSubnets = await db.query(
      'SELECT subnet FROM subnets WHERE orgid = $1',
      [req.orgid]
    );
    for (const existing of allSubnets.rows) {
      if (checkRangesOverlap(p.subnet, existing.subnet)) {
        return res.status(409).json({ 
          error: `subnet overlaps with existing subnet: ${existing.subnet}` 
        });
      }
    }

    // Check if subnet overlaps with any other prefixes in the org (except its parent)
    const allPrefixes = await db.query(
      'SELECT prefix FROM networks WHERE orgid = $1 AND uuid != $2',
      [req.orgid, prefixId]
    );
    for (const existingPrefix of allPrefixes.rows) {
      if (checkRangesOverlap(p.subnet, existingPrefix.prefix)) {
        return res.status(409).json({ 
          error: `subnet overlaps with existing prefix: ${existingPrefix.prefix}` 
        });
      }
    }

    const sql = `INSERT INTO subnets (
      networks_uuid, subnet, site_uuid, vrf_uuid, vlan_uuid, role, tags, description,
      tenant, tenantgroup, orgid, status, user_id, updatedat
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, current_timestamp) RETURNING *`;
    
    const values = [
      prefixId,
      p.subnet,
      p.site_uuid,
      p.vrf_uuid,
      p.vlan_uuid,
      p.role,
      p.tags || null,
      p.description || null,
      p.tenant,
      p.tenantgroup || null,
      req.orgid || null,
      p.status,
      req.user?.user_id || null
    ];

    const result = await db.query(sql, values);
    const createdSubnet = result.rows[0];
    
    // Auto-generate all IPs for the newly created subnet
    await autoGenerateIPsForSubnet(
      createdSubnet.uuid,
      p.subnet,
      req.orgid,
      req.user?.user_id || null
    );
    
    // Emit real-time event
    realtime.emit('subnets:created', createdSubnet);
    
    res.status(201).json(createdSubnet);
  } catch (err) { next(err); }
}

async function listSubnets(req, res, next) {
  try {
    const prefixId = req.params.id;
    
    // Verify prefix exists and belongs to org
    const prefixRes = await db.query('SELECT * FROM networks WHERE uuid = $1 AND orgid = $2', [prefixId, req.orgid]);
    if (prefixRes.rows.length === 0) {
      return res.status(404).json({ error: 'prefix not found' });
    }

    const rows = (await db.query(
      `SELECT ns.uuid, ns.subnet, ns.networks_uuid, json_build_object('uuid', ns.site_uuid, 'name', s.name) as site, 
      json_build_object('uuid', ns.vrf_uuid, 'name', v.name) as vrf,
      json_build_object('uuid', ns.vlan_uuid, 'name', l.name) as vlan,
      ns.role, ns.tags, ns.tenant, ns.tenantgroup, ns. description, ns.orgid, ns.status, ns.createdat, ns.updatedat, 
      ns.user_id
      FROM subnets ns
      left outer join sites s on ns.site_uuid = s.uuid
      left outer join vrfs v on ns.vrf_uuid = v.uuid
      left outer join vlans l on ns.vlan_uuid = l.uuid
      WHERE ns.networks_uuid = $1 AND ns.orgid = $2 ORDER BY ns.subnet`,
      [prefixId, req.orgid]
    )).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function updateSubnet(req, res, next) {
  try {
    const prefixId = req.params.id;
    const subnetId = req.params.subnetId;
    const payload = req.body || {};
    
    // Verify prefix exists and belongs to org
    const prefixRes = await db.query('SELECT * FROM networks WHERE uuid = $1 AND orgid = $2', [prefixId, req.orgid]);
    if (prefixRes.rows.length === 0) {
      return res.status(404).json({ error: 'prefix not found' });
    }
    // const prefix = prefixRes.rows[0];

    // Get subnet
    const getRes = await db.query('SELECT * FROM subnets WHERE uuid = $1 AND networks_uuid = $2', [subnetId, prefixId]);
    const row = getRes.rows[0];
    if (!row) return res.status(404).json({ error: 'subnet not found' });
    if (row.orgid !== req.orgid) return res.status(403).json({ error: 'org mismatch' });

    // Validate subnet if being updated and ensure it's within prefix
    // if (payload.subnet) {
    //   try {
    //     const subnetStr = payload.subnet.includes('/') ? payload.subnet : `${payload.subnet}/32`;
    //     let subnetAddr, prefixAddr;
        
    //     if (subnetStr.includes(':')) {
    //       subnetAddr = new Address6(subnetStr);
    //       prefixAddr = new Address6(prefix.prefix);
    //     } else {
    //       subnetAddr = new Address4(subnetStr);
    //       prefixAddr = new Address4(prefix.prefix);
    //     }

    //     if (!subnetAddr.isInSubnet(prefixAddr)) {
    //       return res.status(400).json({ error: 'subnet must be within the parent prefix' });
    //     }
    //   } catch (err) {
    //     return res.status(400).json({ error: 'invalid subnet format' });
    //   }
    // }

    const allowedKeys = ['site_uuid', 'vrf_uuid', 'vlan_uuid', 'role', 'tags', 'description', 'tenant', 'tenantgroup', 'status'];
    const newpayload = await common.allowedUpdateKeys(payload, allowedKeys);

    const keys = Object.keys(newpayload);
    const values = Object.values(newpayload);
    let sql, qValues;
    
    if (keys.length === 0) {
      sql = `UPDATE subnets SET updatedat = current_timestamp, user_id = $1 WHERE uuid = $2 RETURNING *`;
      qValues = [req.user?.user_id || null, subnetId];
    } else {
      const setClauses = keys.map((k, i) => `"${k}"=$${i + 1}`).join(', ');
      sql = `UPDATE subnets SET ${setClauses}, updatedat = current_timestamp, user_id = $${values.length + 1} WHERE uuid = $${values.length + 2} RETURNING *`;
      qValues = values.concat([req.user?.user_id || null, subnetId]);
    }
    
    const result = await db.query(sql, qValues);
    const updatedSubnet = result.rows[0];
    
    // Emit real-time event
    realtime.emit('subnets:updated', updatedSubnet);
    
    res.json(updatedSubnet);
  } catch (err) { next(err); }
}

async function deleteSubnet(req, res, next) {
  try {
    const prefixId = req.params.id;
    const subnetId = req.params.subnetId;

    const activeIps = await db.query(`SELECT * FROM ips WHERE subnets_uuid = $1 AND orgid = $2 AND status != 'disabled' `, [subnetId, req.orgid]);
    if (activeIps.rows.length !== 0) {
      return res.status(404).json({ error: 'Cannot delete: This subnet is currently in use by one or more active IP addresses.' });
    }
    
    // Verify prefix exists and belongs to org
    const prefixRes = await db.query('SELECT * FROM networks WHERE uuid = $1 AND orgid = $2', [prefixId, req.orgid]);
    if (prefixRes.rows.length === 0) {
      return res.status(404).json({ error: 'prefix not found' });
    }

    const getRes = await db.query('SELECT * FROM subnets WHERE uuid = $1 AND networks_uuid = $2', [subnetId, prefixId]);
    const row = getRes.rows[0];
    if (!row) return res.status(404).json({ error: 'subnet not found' });
    if (row.orgid !== req.orgid) return res.status(403).json({ error: 'org mismatch' });
    
    await db.query('DELETE FROM subnets WHERE uuid = $1', [subnetId]);
    
    // Emit real-time event
    realtime.emit('subnets:deleted', { id: subnetId, org_id: req.orgid });
    
    res.status(204).send();
  } catch (err) { next(err); }
}

// ==================== IPs ====================

// async function createIP(req, res, next) {
//   try {
//     const prefixId = req.params.id;
//     const subnetId = req.params.subnetId;
//     const p = req.body || {};
    
//     // Verify prefix exists and belongs to org
//     const prefixRes = await db.query('SELECT * FROM networks WHERE uuid = $1 AND orgid = $2', [prefixId, req.orgid]);
//     if (prefixRes.rows.length === 0) {
//       return res.status(404).json({ error: 'prefix not found' });
//     }

//     // Verify subnet exists and belongs to prefix
//     const subnetRes = await db.query('SELECT * FROM subnets WHERE uuid = $1 AND networks_uuid = $2 AND orgid = $3', [subnetId, prefixId, req.orgid]);
//     if (subnetRes.rows.length === 0) {
//       return res.status(404).json({ error: 'subnet not found' });
//     }
//     const subnet = subnetRes.rows[0];

//     // If IP is provided, validate it; otherwise generate next available IP
//     let ipAddress;
//     if (p.ip) {
//       // Validate IP format and ensure it's within the subnet
//       try {
//         const ipStr = p.ip;
//         let ipAddr, subnetAddr;
        
//         if (ipStr.includes(':')) {
//           ipAddr = new Address6(ipStr);
//           subnetAddr = new Address6(subnet.subnet);
//         } else {
//           ipAddr = new Address4(ipStr);
//           subnetAddr = new Address4(subnet.subnet);
//         }

//         if (!ipAddr.isInSubnet(subnetAddr)) {
//           return res.status(400).json({ error: 'IP address must be within the subnet' });
//         }

//         // Check if IP already exists
//         const existingIP = await db.query('SELECT * FROM ips WHERE ip = $1 AND subnets_uuid = $2 AND orgid = $3', [p.ip, subnetId, req.orgid]);
//         if (existingIP.rows.length > 0) {
//           return res.status(409).json({ error: 'IP address already exists in this subnet' });
//         }

//         ipAddress = p.ip;
//       } catch (err) {
//         return res.status(400).json({ error: 'invalid IP address format' });
//       }
//     } else {
//       // Generate next available IP in subnet
//       try {
//         const subnetAddr = subnet.subnet.includes(':') 
//           ? new Address6(subnet.subnet)
//           : new Address4(subnet.subnet);
        
//         // Get all existing IPs in this subnet
//         const existingIPs = await db.query(
//           'SELECT ip::text as ip FROM ips WHERE subnets_uuid = $1 AND orgid = $2',
//           [subnetId, req.orgid]
//         );
        
//         const usedIPs = new Set(existingIPs.rows.map(r => r.ip));
        
//         // Find first available IP using BigInt arithmetic
//         const startIP = subnetAddr.startAddress();
//         const endIP = subnetAddr.endAddress();
        
//         let found = false;
        
//         // Skip network and broadcast addresses for IPv4
//         if (subnetAddr instanceof Address4) {
//           // Get BigInt values (v10.x uses bigInt() which returns native BigInt)
//           const startBigInt = startIP.bigInt();
//           const endBigInt = endIP.bigInt();
          
//           // Skip first address (network) and last address (broadcast)
//           let currentBigInt = startBigInt + BigInt(1);
//           const endBigIntUsable = endBigInt - BigInt(1);
          
//           while (currentBigInt <= endBigIntUsable && !found) {
//             // Convert BigInt back to Address4
//             const currentAddr = Address4.fromBigInt(currentBigInt);
//             const ipStr = currentAddr.address;
            
//             if (!usedIPs.has(ipStr)) {
//               ipAddress = ipStr;
//               found = true;
//             } else {
//               currentBigInt = currentBigInt + BigInt(1);
//             }
//           }
//         } else {
//           // For IPv6, use BigInt arithmetic
//           const startBigInt = startIP.bigInt();
//           const endBigInt = endIP.bigInt();
          
//           // Skip first address (network)
//           let currentBigInt = startBigInt + BigInt(1);
          
//           while (currentBigInt <= endBigInt && !found) {
//             // Convert BigInt back to Address6
//             const currentAddr = Address6.fromBigInt(currentBigInt);
//             const ipStr = currentAddr.correctForm();
            
//             if (!usedIPs.has(ipStr)) {
//               ipAddress = ipStr;
//               found = true;
//             } else {
//               currentBigInt = currentBigInt + BigInt(1);
//             }
//           }
//         }
        
//         if (!found) {
//           return res.status(409).json({ error: 'no available IP addresses in this subnet' });
//         }
//       } catch (err) {
//         return res.status(400).json({ error: 'failed to generate IP address: ' + err.message });
//       }
//     }

//     const sql = `INSERT INTO ips (
//       subnets_uuid, ip, orgid, status, user_id, updatedat
//     ) VALUES ($1, $2, $3, $4, $5, current_timestamp) RETURNING *`;
    
//     const values = [
//       subnetId,
//       ipAddress,
//       req.orgid || null,
//       p.status || 'available',
//       req.user?.user_id || null
//     ];

//     const result = await db.query(sql, values);
//     const createdIP = result.rows[0];
    
//     // Emit real-time event
//     realtime.emit('ips:created', createdIP);
    
//     res.status(201).json(createdIP);
//   } catch (err) { next(err); }
// }

// async function createIPsBatch(req, res, next) {
//   try {
//     const prefixId = req.params.id;
//     const subnetId = req.params.subnetId;
//     const p = req.body || {};
    
//     // Verify prefix exists and belongs to org
//     const prefixRes = await db.query('SELECT * FROM networks WHERE uuid = $1 AND orgid = $2', [prefixId, req.orgid]);
//     if (prefixRes.rows.length === 0) {
//       return res.status(404).json({ error: 'prefix not found' });
//     }

//     // Verify subnet exists and belongs to prefix
//     const subnetRes = await db.query('SELECT * FROM subnets WHERE uuid = $1 AND networks_uuid = $2 AND orgid = $3', [subnetId, prefixId, req.orgid]);
//     if (subnetRes.rows.length === 0) {
//       return res.status(404).json({ error: 'subnet not found' });
//     }
//     const subnet = subnetRes.rows[0];

//     const count = p.count || 1;
//     if (count < 1 || count > 1000) {
//       return res.status(400).json({ error: 'count must be between 1 and 1000' });
//     }

//     try {
//       const subnetAddr = subnet.subnet.includes(':') 
//         ? new Address6(subnet.subnet)
//         : new Address4(subnet.subnet);
      
//       // Get all existing IPs in this subnet
//       const existingIPs = await db.query(
//         'SELECT ip::text as ip FROM ips WHERE subnets_uuid = $1 AND orgid = $2',
//         [subnetId, req.orgid]
//       );
      
//       const usedIPs = new Set(existingIPs.rows.map(r => r.ip));
      
//       // Find available IPs using BigInt arithmetic
//       const startIP = subnetAddr.startAddress();
//       const endIP = subnetAddr.endAddress();
      
//       const generatedIPs = [];
      
//       // Skip network and broadcast addresses for IPv4
//       if (subnetAddr instanceof Address4) {
//         // Get BigInt values (v10.x uses bigInt() which returns native BigInt)
//         const startBigInt = startIP.bigInt();
//         const endBigInt = endIP.bigInt();
        
//         // Skip first address (network) and last address (broadcast)
//         let currentBigInt = startBigInt + BigInt(1);
//         const endBigIntUsable = endBigInt - BigInt(1);
        
//         while (currentBigInt <= endBigIntUsable && generatedIPs.length < count) {
//           // Convert BigInt back to Address4
//           const currentAddr = Address4.fromBigInt(currentBigInt);
//           const ipStr = currentAddr.address;
          
//           if (!usedIPs.has(ipStr)) {
//             generatedIPs.push(ipStr);
//           }
//           currentBigInt = currentBigInt + BigInt(1);
//         }
//       } else {
//         // For IPv6, use BigInt arithmetic
//         const startBigInt = startIP.bigInt();
//         const endBigInt = endIP.bigInt();
        
//         // Skip first address (network)
//         let currentBigInt = startBigInt + BigInt(1);
        
//         while (currentBigInt <= endBigInt && generatedIPs.length < count) {
//           // Convert BigInt back to Address6
//           const currentAddr = Address6.fromBigInt(currentBigInt);
//           const ipStr = currentAddr.correctForm();
          
//           if (!usedIPs.has(ipStr)) {
//             generatedIPs.push(ipStr);
//           }
//           currentBigInt = currentBigInt + BigInt(1);
//         }
//       }
      
//       if (generatedIPs.length < count) {
//         return res.status(409).json({ 
//           error: `only ${generatedIPs.length} available IP addresses found, requested ${count}` 
//         });
//       }

//       // Insert all IPs in a transaction
//       const results = [];
//       for (const ip of generatedIPs) {
//         const sql = `INSERT INTO ips (
//           subnets_uuid, ip, orgid, status, user_id, updatedat
//         ) VALUES ($1, $2, $3, $4, $5, current_timestamp) RETURNING *`;
        
//         const values = [
//           subnetId,
//           ip,
//           req.orgid || null,
//           p.status || 'available',
//           req.user?.user_id || null
//         ];

//         const result = await db.query(sql, values);
//         results.push(result.rows[0]);
        
//         // Emit real-time event for each created IP
//         realtime.emit('ips:created', result.rows[0]);
//       }

//       res.status(201).json({ items: results, count: results.length });
//     } catch (err) {
//       return res.status(400).json({ error: 'failed to generate IP addresses: ' + err.message });
//     }
//   } catch (err) { next(err); }
// }

async function listIPs(req, res, next) {
  try {
    const prefixId = req.params.id;
    const subnetId = req.params.subnetId;
    
    // Verify prefix exists and belongs to org
    const prefixRes = await db.query('SELECT * FROM networks WHERE uuid = $1 AND orgid = $2', [prefixId, req.orgid]);
    if (prefixRes.rows.length === 0) {
      return res.status(404).json({ error: 'prefix not found' });
    }

    // Verify subnet exists and belongs to prefix
    const subnetRes = await db.query('SELECT * FROM subnets WHERE uuid = $1 AND networks_uuid = $2 AND orgid = $3', [subnetId, prefixId, req.orgid]);
    if (subnetRes.rows.length === 0) {
      return res.status(404).json({ error: 'subnet not found' });
    }

    const rows = (await db.query(
      'SELECT * FROM ips WHERE subnets_uuid = $1 AND orgid = $2 ORDER BY ip',
      [subnetId, req.orgid]
    )).rows;
    res.json({ items: rows });
  } catch (err) { next(err); }
}

async function updateIP(req, res, next) {
  try {
    const prefixId = req.params.id;
    const subnetId = req.params.subnetId;
    const ipId = req.params.ipId;
    const payload = req.body || {};
    
    // Verify prefix exists and belongs to org
    const prefixRes = await db.query('SELECT * FROM networks WHERE uuid = $1 AND orgid = $2', [prefixId, req.orgid]);
    if (prefixRes.rows.length === 0) {
      return res.status(404).json({ error: 'prefix not found' });
    }

    // Verify subnet exists and belongs to prefix
    const subnetRes = await db.query('SELECT * FROM subnets WHERE uuid = $1 AND networks_uuid = $2 AND orgid = $3', [subnetId, prefixId, req.orgid]);
    if (subnetRes.rows.length === 0) {
      return res.status(404).json({ error: 'subnet not found' });
    }
    const subnet = subnetRes.rows[0];

    // Get IP
    const getRes = await db.query('SELECT * FROM ips WHERE uuid = $1 AND subnets_uuid = $2', [ipId, subnetId]);
    const row = getRes.rows[0];
    if (!row) return res.status(404).json({ error: 'IP not found' });
    if (row.orgid !== req.orgid) return res.status(403).json({ error: 'org mismatch' });

    // Validate IP if being updated and ensure it's within subnet
    // if (payload.ip) {
    //   try {
    //     const ipStr = payload.ip;
    //     let ipAddr, subnetAddr;
        
    //     if (ipStr.includes(':')) {
    //       ipAddr = new Address6(ipStr);
    //       subnetAddr = new Address6(subnet.subnet);
    //     } else {
    //       ipAddr = new Address4(ipStr);
    //       subnetAddr = new Address4(subnet.subnet);
    //     }

    //     if (!ipAddr.isInSubnet(subnetAddr)) {
    //       return res.status(400).json({ error: 'IP address must be within the subnet' });
    //     }

    //     // Check if IP already exists (excluding current IP)
    //     const existingIP = await db.query(
    //       'SELECT * FROM ips WHERE ip = $1 AND subnets_uuid = $2 AND uuid != $3 AND orgid = $4',
    //       [payload.ip, subnetId, ipId, req.orgid]
    //     );
    //     if (existingIP.rows.length > 0) {
    //       return res.status(409).json({ error: 'IP address already exists in this subnet' });
    //     }
    //   } catch (err) {
    //     return res.status(400).json({ error: 'invalid IP address format' });
    //   }
    // }
    const newpayload = await common.allowedUpdateKeys(payload, ['status']);
    
    const keys = Object.keys(newpayload);
    const values = Object.values(newpayload);
    let sql, qValues;
    
    
    if (keys.length === 0) {
      sql = `UPDATE ips SET updatedat = current_timestamp, user_id = $1 WHERE uuid = $2 RETURNING *`;
      qValues = [req.user?.user_id || null, ipId];
    } else {
      const setClauses = keys.map((k, i) => `"${k}"=$${i + 1}`).join(', ');
      sql = `UPDATE ips SET ${setClauses}, updatedat = current_timestamp, user_id = $${values.length + 1} WHERE uuid = $${values.length + 2} RETURNING *`;
      qValues = values.concat([req.user?.user_id || null, ipId]);
    }
    
    const result = await db.query(sql, qValues);
    const updatedIP = result.rows[0];
    
    // Emit real-time event
    realtime.emit('ips:updated', updatedIP);
    
    res.json(updatedIP);
  } catch (err) { next(err); }
}

// async function deleteIP(req, res, next) {
//   try {
//     const prefixId = req.params.id;
//     const subnetId = req.params.subnetId;
//     const ipId = req.params.ipId;
    
//     // Verify prefix exists and belongs to org
//     const prefixRes = await db.query('SELECT * FROM networks WHERE uuid = $1 AND orgid = $2', [prefixId, req.orgid]);
//     if (prefixRes.rows.length === 0) {
//       return res.status(404).json({ error: 'prefix not found' });
//     }

//     // Verify subnet exists and belongs to prefix
//     const subnetRes = await db.query('SELECT * FROM subnets WHERE uuid = $1 AND networks_uuid = $2 AND orgid = $3', [subnetId, prefixId, req.orgid]);
//     if (subnetRes.rows.length === 0) {
//       return res.status(404).json({ error: 'subnet not found' });
//     }

//     const getRes = await db.query('SELECT * FROM ips WHERE uuid = $1 AND subnets_uuid = $2', [ipId, subnetId]);
//     const row = getRes.rows[0];
//     if (!row) return res.status(404).json({ error: 'IP not found' });
//     if (row.orgid !== req.orgid) return res.status(403).json({ error: 'org mismatch' });
    
//     await db.query('DELETE FROM ips WHERE uuid = $1', [ipId]);
    
//     // Emit real-time event
//     realtime.emit('ips:deleted', { id: ipId, org_id: req.orgid });
    
//     res.status(204).send();
//   } catch (err) { next(err); }
// }

module.exports = {
  // Prefixes
  createPrefix,
  listPrefixes,
  getPrefix,
  updatePrefix,
  deletePrefix,
  // Subnets
  createSubnet,
  listSubnets,
  updateSubnet,
  deleteSubnet,
  // IPs
  // createIP,
  // createIPsBatch,
  listIPs,
  updateIP,
  // deleteIP,
};
