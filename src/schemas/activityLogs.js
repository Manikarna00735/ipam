const Joi = require('joi');

const MODULES    = ['core', 'alerts', 'ams', 'ipam', 'system', 'dcim'];
const CATEGORIES = ['security', 'governance', 'operational', 'config', 'automation', 'billing'];
const SEVERITIES = ['info', 'warning', 'critical'];
const OUTCOMES   = ['success', 'failed', 'denied', 'partial', 'pending'];
const ACTOR_TYPES = ['user', 'service_account', 'integration', 'system'];

// POST /api/activity-logs — write a single log event
exports.logCreate = Joi.object({
  module:        Joi.string().valid(...MODULES).required(),
  category:      Joi.string().valid(...CATEGORIES).required(),
  event_type:    Joi.string().trim().min(1).max(100).required(),
  event_label:   Joi.string().trim().min(1).max(255).required(),
  severity:      Joi.string().valid(...SEVERITIES).default('info'),
  outcome:       Joi.string().valid(...OUTCOMES).default('success'),
  actor_type:    Joi.string().valid(...ACTOR_TYPES).default('user'),
  actor_id:      Joi.string().trim().max(255).allow('', null),
  actor_display: Joi.string().trim().max(255).allow('', null),
  target_type:   Joi.string().trim().max(100).allow('', null),
  target_id:     Joi.string().trim().max(255).allow('', null),
  target_display: Joi.string().trim().max(255).allow('', null),
  source:        Joi.string().trim().max(50).allow('', null),
  ip_address:    Joi.string().trim().max(45).allow('', null),
  user_agent:    Joi.string().trim().max(500).allow('', null),
  request_id:    Joi.string().trim().max(255).allow('', null),
  correlation_id: Joi.string().trim().max(255).allow('', null),
  metadata:      Joi.object().allow(null),
  changes:       Joi.object({
    old: Joi.object().allow(null),
    new: Joi.object().allow(null),
  }).allow(null),
});

// POST /api/activity-logs/query — filter and paginate logs
exports.logQuery = Joi.object({
  page:           Joi.number().integer().min(1).default(1),
  page_size:      Joi.number().integer().min(1).max(100).default(50),
  from:           Joi.string().isoDate().allow('', null),
  to:             Joi.string().isoDate().allow('', null),
  module:         Joi.string().valid(...MODULES).allow('', null),
  categories:     Joi.array().items(Joi.string().valid(...CATEGORIES)).allow(null),
  severities:     Joi.array().items(Joi.string().valid(...SEVERITIES)).allow(null),
  actor_type:     Joi.string().valid(...ACTOR_TYPES).allow('', null),
  actor_search:   Joi.string().trim().max(255).allow('', null),
  event_types:    Joi.array().items(Joi.string().trim().max(100)).allow(null),
  target_type:    Joi.string().trim().max(100).allow('', null),
  target_search:  Joi.string().trim().max(255).allow('', null),
  outcome:        Joi.string().valid(...OUTCOMES).allow('', null),
  source:         Joi.string().trim().max(50).allow('', null),
  correlation_id: Joi.string().trim().max(255).allow('', null),
  ip_address:     Joi.string().trim().max(45).allow('', null),
  user_agent:     Joi.string().trim().max(500).allow('', null),
});
