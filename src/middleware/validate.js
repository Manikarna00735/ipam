const xss = require('xss');

// Recursively sanitize all string values in an object against XSS.
// Runs after Joi validation has already stripped unknown fields and
// coerced types, so we only need to handle string/array/object.
function sanitizeStrings(value) {
  if (typeof value === 'string') return xss(value);
  if (Array.isArray(value)) return value.map(sanitizeStrings);
  if (value !== null && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = sanitizeStrings(v);
    return out;
  }
  return value;
}

/**
 * Returns an Express middleware that:
 *  1. Validates req.body against the provided Joi schema
 *  2. Strips unknown fields (prevents extra keys from reaching SQL)
 *  3. Sanitizes all string values against XSS
 *  4. Replaces req.body with the cleaned value
 *
 * @param {import('joi').Schema} schema
 */
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,    // return all errors at once
      stripUnknown: true,   // drop keys not in schema — critical for dynamic SQL builders
      convert: true,        // coerce strings to numbers/booleans (needed for multipart forms)
    });

    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message),
      });
    }

    req.body = sanitizeStrings(value);
    next();
  };
}

module.exports = { validate };
