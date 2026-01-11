function requireOrg(req, res, next) {
  const orgId = req.headers['x-org-id'];
  if (!orgId) return res.status(400).json({ error: 'X-Org-Id header required' });
  req.orgid = orgId;
  next();
}

function ensureOrgMatches(rowOrgId, req, res) {
  if (!rowOrgId || rowOrgId !== req.orgid) {
    res.status(403).json({ error: 'org mismatch' });
    return false;
  }
  return true;
}

module.exports = { requireOrg, ensureOrgMatches };
