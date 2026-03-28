const Joi = require('joi');

// ─── Reusable primitives ──────────────────────────────────────────────────────
const str     = () => Joi.string().trim().max(255).allow('', null);
const strReq  = () => Joi.string().trim().min(1).max(255).required();
const uuidReq = () => Joi.string().uuid().required();
const uuidOpt = () => Joi.string().uuid().allow('', null);
const text    = () => Joi.string().trim().max(10000).allow('', null);
const dateStr = () => Joi.string().isoDate().allow('', null);
const arrStr  = () => Joi.array().items(Joi.string().trim().max(500)).allow(null);

// ─── Vendors ─────────────────────────────────────────────────────────────────
exports.vendorCreate = Joi.object({
  name:                 strReq(),
  vendor_type:          strReq(),
  category:             strReq(),
  internal_owner:       strReq(),
  email:                Joi.string().trim().email({ tlds: { allow: false } }).required(),
  status:               Joi.string().trim().valid('Active', 'Inactive').default('Active'),
  primary_contact_name: str(),
  phone:                str(),
  website:              Joi.string().trim().uri().max(500).allow('', null),
  vendor_criticality:   Joi.string().trim().valid('Low', 'Medium', 'High', 'Critical').default('Medium'),
  notes:                text(),
  attachments:          arrStr(),
});

exports.vendorUpdate = Joi.object({
  name:                 Joi.string().trim().min(1).max(255),
  vendor_type:          Joi.string().trim().min(1).max(100),
  category:             Joi.string().trim().min(1).max(100),
  internal_owner:       Joi.string().trim().min(1).max(255),
  email:                Joi.string().trim().email({ tlds: { allow: false } }),
  status:               Joi.string().trim().valid('Active', 'Inactive'),
  primary_contact_name: str(),
  phone:                str(),
  website:              Joi.string().trim().uri().max(500).allow('', null),
  vendor_criticality:   Joi.string().trim().valid('Low', 'Medium', 'High', 'Critical'),
  notes:                text(),
  attachments:          arrStr(),
}).min(1);

// ─── Contracts ───────────────────────────────────────────────────────────────
exports.contractCreate = Joi.object({
  contract_name:   strReq(),
  contract_type:   strReq(),
  vendor_uuid:     uuidReq(),
  status:          Joi.string().trim().max(50).default('Active'),
  start_date:      dateStr(),
  end_date:        dateStr(),
  value:           Joi.number().min(0).default(0),
  currency:        Joi.string().trim().uppercase().length(3).default('USD'),
  payment_terms:   str(),
  renewal_type:    str(),
  notice_period:   Joi.number().integer().min(0).default(0),
  renewal_reminder: Joi.number().integer().min(0).default(30),
  internal_owner:  str(),
  linked_assets:   arrStr(),
  linked_licenses: arrStr(),
  linked_pos:      arrStr(),
  documents:       arrStr(),
  notes:           text(),
});

exports.contractUpdate = Joi.object({
  contract_name:   Joi.string().trim().min(1).max(255),
  contract_type:   Joi.string().trim().min(1).max(100),
  vendor_uuid:     uuidOpt(),
  status:          Joi.string().trim().max(50),
  start_date:      dateStr(),
  end_date:        dateStr(),
  value:           Joi.number().min(0),
  currency:        Joi.string().trim().uppercase().length(3),
  payment_terms:   str(),
  renewal_type:    str(),
  notice_period:   Joi.number().integer().min(0),
  renewal_reminder: Joi.number().integer().min(0),
  internal_owner:  str(),
  linked_assets:   arrStr(),
  linked_licenses: arrStr(),
  linked_pos:      arrStr(),
  documents:       arrStr(),
  notes:           text(),
}).min(1);

// ─── Purchase Orders ─────────────────────────────────────────────────────────
const PO_STATUSES = ['DRAFT', 'SUBMITTED', 'APPROVED', 'ORDERED', 'RECEIVED', 'PARTIALLY_RECEIVED', 'CANCELLED'];

exports.purchaseOrderCreate = Joi.object({
  po_id:               Joi.string().trim().min(1).max(32).required(),
  vendor_uuid:         uuidReq(),
  site_uuid:           uuidReq(),
  quantity:            Joi.number().integer().min(1).required(),
  unit_cost:           Joi.number().min(0).required(),
  department:          str(),
  owner_requester_id:  str(),
  status:              Joi.string().trim().valid(...PO_STATUSES).default('DRAFT'),
  category:            str(),
  manufacturer_uuid:   uuidOpt(),
  model:               str(),
  purchase_date:       dateStr(),
  warranty_expiry:     dateStr(),
  quantity_received:   Joi.number().integer().min(0).default(0),
});

exports.purchaseOrderUpdate = Joi.object({
  vendor_uuid:         uuidOpt(),
  site_uuid:           uuidOpt(),
  quantity:            Joi.number().integer().min(1),
  unit_cost:           Joi.number().min(0),
  department:          str(),
  owner_requester_id:  str(),
  status:              Joi.string().trim().valid(...PO_STATUSES),
  category:            str(),
  manufacturer_uuid:   uuidOpt(),
  model:               str(),
  purchase_date:       dateStr(),
  warranty_expiry:     dateStr(),
  quantity_received:   Joi.number().integer().min(0),
  // total_value is a GENERATED ALWAYS column — never allow it to be sent
}).min(1);

// ─── Assets ──────────────────────────────────────────────────────────────────
const ASSET_STATUSES = ['Active', 'Inactive', 'In Repair', 'Decommissioned', 'In Transit', 'Retired'];

exports.assetCreate = Joi.object({
  asset_id:              Joi.string().trim().min(1).max(64).required(),
  category:              strReq(),
  site_uuid:             uuidReq(),
  status:                Joi.string().trim().min(1).max(50).required(),
  manufacturer_uuid:     uuidOpt(),
  model:                 str(),
  serial_no:             str(),
  department:            str(),
  assigned_to:           str(),
  cost_center:           str(),
  purchase_order_uuid:   uuidOpt(),
  purchase_date:         dateStr(),
  warranty_expiry:       dateStr(),
  expected_eol:          dateStr(),
  purchase_cost:         Joi.number().min(0).allow(null),
  depreciation_method:   str(),
  depreciation_rate_pct: Joi.number().min(0).max(100).allow(null),
});

exports.assetUpdate = Joi.object({
  asset_id:              Joi.string().trim().min(1).max(64),
  category:              Joi.string().trim().min(1).max(255),
  site_uuid:             uuidOpt(),
  status:                Joi.string().trim().min(1).max(50),
  manufacturer_uuid:     uuidOpt(),
  model:                 str(),
  serial_no:             str(),
  department:            str(),
  assigned_to:           str(),
  cost_center:           str(),
  purchase_order_uuid:   uuidOpt(),
  purchase_date:         dateStr(),
  warranty_expiry:       dateStr(),
  expected_eol:          dateStr(),
  purchase_cost:         Joi.number().min(0).allow(null),
  depreciation_method:   str(),
  depreciation_rate_pct: Joi.number().min(0).max(100).allow(null),
  // qr_code_url and qr_code_generated_at are server-managed — not user-settable
}).min(1);
