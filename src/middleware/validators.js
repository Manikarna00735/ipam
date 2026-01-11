const { body, validationResult } = require('express-validator');
const ipUtils = require('../utils/ipUtils');

const validate = (checks) => async (req, res, next) => {
  await Promise.all(checks.map((c) => c.run(req)));
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

const registerChecks = [
  body('email').isEmail().withMessage('valid email required'),
  body('password').isLength({ min: 6 }).withMessage('password min 6 chars'),
];

const loginChecks = [
  body('email').isEmail().withMessage('valid email required'),
  body('password').exists().withMessage('password required'),
];

const prefixChecks = [
  body('prefix').exists().withMessage('prefix required'),
];

const subnetChecks = [
  body('subnet').exists().withMessage('subnet required').custom((v) => {
    if (!ipUtils.cidrContains(v, v) && !v.includes('/')) throw new Error('invalid cidr');
    return true;
  }),
];

const ipChecks = [
  body('ip').exists().withMessage('ip required'),
];

// removed simple requireFields in favor of typed validator `requireFieldsTypes`

const requireFieldsTypes = (schema) => (req, res, next) => {
  const body = req.body || {};
  const missing = [];
  const wrong = [];
  for (const [field, type] of Object.entries(schema)) {
    const v = body[field];
    if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) {
      missing.push(field);
      continue;
    }
    let ok = true;
    switch (type) {
      case 'string': ok = typeof v === 'string'; break;
      case 'boolean': ok = typeof v === 'boolean'; break;
      case 'number': ok = typeof v === 'number'; break;
      case 'array': ok = Array.isArray(v); break;
      case 'object': ok = typeof v === 'object' && !Array.isArray(v); break;
      case 'uuid': ok = typeof v === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v); break;
      case 'email': ok = typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); break;
      default: ok = true;
    }
    if (!ok) wrong.push(`${field}:${type}`);
  }
  if (missing.length) return res.status(400).json({ error: `missing required fields: ${missing.join(',')}` });
  if (wrong.length) return res.status(400).json({ error: `invalid types for fields: ${wrong.join(',')}` });
  next();
};

module.exports = {
  validateRegister: validate(registerChecks),
  validateLogin: validate(loginChecks),
  validatePrefix: validate(prefixChecks),
  validateSubnet: validate(subnetChecks),
  validateIp: validate(ipChecks),
  requireFieldsTypes,
};
