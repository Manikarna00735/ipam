const express = require('express');
const router = express.Router();
const resourceFactory = require('../controllers/resourceFactory');
const { requireOrg } = require('../middleware/org');
const { requireAuth } = require('../middleware/auth');

function createRoutes(table, opts = {}) {
  const c = resourceFactory({ table, requiredFields: opts.requiredFields || [], slugUnique: opts.slugUnique });
  const r = express.Router();
  r.use(requireAuth);
  r.use(requireOrg);
  r.post('/', c.create);
  r.get('/', c.list);
  r.get('/:id', c.get);
  r.put('/:id', c.update);
  r.delete('/:id', c.remove);
  return r;
}

// Export helper
module.exports = { createRoutes };
