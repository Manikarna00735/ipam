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

module.exports = {
  validateRegister: validate(registerChecks),
  validateLogin: validate(loginChecks),
  validatePrefix: validate(prefixChecks),
  validateSubnet: validate(subnetChecks),
  validateIp: validate(ipChecks),
};
