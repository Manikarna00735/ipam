/**
 * OpenAPI 3.0 specification for the PAGENTZ IPAM & Assets API.
 * Served at GET /api-docs via swagger-ui-express.
 */

const swaggerJsdoc = require('swagger-jsdoc');

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'PAGENTZ IPAM & Assets API',
    version: '0.1.0',
    description:
      'REST API for IP Address Management (IPAM) and IT Asset Management (AMS). ' +
      'All endpoints require a Firebase Bearer token (`Authorization: Bearer <token>`) ' +
      'and an org identifier (`X-Org-Id: <orgid>`) unless noted otherwise.',
  },
  servers: [
    { url: 'http://localhost:5000', description: 'Local dev' },
    { url: 'https://pagentz.web.app', description: 'Production' },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'Firebase ID Token',
        description: 'Firebase ID token obtained from the client SDK.',
      },
    },
    parameters: {
      OrgId: {
        name: 'X-Org-Id',
        in: 'header',
        required: true,
        schema: { type: 'string' },
        description: 'Organisation identifier — required on every protected request.',
      },
      UuidPath: {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
      },
      PageQuery: {
        name: 'page',
        in: 'query',
        schema: { type: 'integer', minimum: 1, default: 1 },
      },
      PageSizeQuery: {
        name: 'page_size',
        in: 'query',
        schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Missing or invalid Firebase token.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      Forbidden: {
        description: 'Valid token but no access to this org.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      NotFound: {
        description: 'Resource not found.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      ValidationError: {
        description: 'Request body failed validation.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          details: { type: 'array', items: { type: 'string' } },
        },
      },
      PaginatedMeta: {
        type: 'object',
        properties: {
          total:     { type: 'integer' },
          page:      { type: 'integer' },
          page_size: { type: 'integer' },
        },
      },
      // ── IPAM ──────────────────────────────────────────────────────────────────
      Prefix: {
        type: 'object',
        properties: {
          uuid:        { type: 'string', format: 'uuid' },
          prefix:      { type: 'string', example: '10.0.0.0/8' },
          status:      { type: 'string', example: 'active' },
          role:        { type: 'string' },
          tenant:      { type: 'string' },
          tenantgroup: { type: 'string' },
          vrf_uuid:    { type: 'string', format: 'uuid', nullable: true },
          vlan_uuid:   { type: 'string', format: 'uuid', nullable: true },
          site_uuid:   { type: 'string', format: 'uuid' },
          tags:        { type: 'string', nullable: true },
          orgid:       { type: 'string' },
          deleted_at:  { type: 'string', format: 'date-time', nullable: true },
        },
      },
      PrefixCreate: {
        type: 'object',
        required: ['prefix', 'site_uuid', 'status', 'role', 'tenant'],
        properties: {
          prefix:      { type: 'string', example: '192.168.1.0/24' },
          site_uuid:   { type: 'string', format: 'uuid' },
          status:      { type: 'string', example: 'active' },
          role:        { type: 'string', example: 'production' },
          tenant:      { type: 'string', example: 'engineering' },
          tenantgroup: { type: 'string', nullable: true },
          vrf_uuid:    { type: 'string', format: 'uuid', nullable: true },
          vlan_uuid:   { type: 'string', format: 'uuid', nullable: true },
          tags:        { type: 'string', nullable: true },
        },
      },
      Subnet: {
        type: 'object',
        properties: {
          uuid:        { type: 'string', format: 'uuid' },
          subnet:      { type: 'string', example: '10.0.1.0/24' },
          network_uuid: { type: 'string', format: 'uuid' },
          status:      { type: 'string' },
          role:        { type: 'string' },
          tenant:      { type: 'string' },
          site_uuid:   { type: 'string', format: 'uuid' },
          vrf_uuid:    { type: 'string', format: 'uuid', nullable: true },
          vlan_uuid:   { type: 'string', format: 'uuid', nullable: true },
          description: { type: 'string', nullable: true },
          tags:        { type: 'string', nullable: true },
        },
      },
      SubnetCreate: {
        type: 'object',
        required: ['subnet', 'site_uuid', 'status', 'role', 'tenant'],
        properties: {
          subnet:      { type: 'string', example: '10.0.1.0/24' },
          site_uuid:   { type: 'string', format: 'uuid' },
          status:      { type: 'string' },
          role:        { type: 'string' },
          tenant:      { type: 'string' },
          tenantgroup: { type: 'string', nullable: true },
          vrf_uuid:    { type: 'string', format: 'uuid', nullable: true },
          vlan_uuid:   { type: 'string', format: 'uuid', nullable: true },
          description: { type: 'string', nullable: true },
          tags:        { type: 'string', nullable: true },
        },
      },
      IP: {
        type: 'object',
        properties: {
          uuid:       { type: 'string', format: 'uuid' },
          address:    { type: 'string', example: '10.0.1.5' },
          status:     { type: 'string' },
          hostname:   { type: 'string', nullable: true },
          decription: { type: 'string', nullable: true, description: 'Known typo — matches DB column.' },
          is_gateway: { type: 'boolean', nullable: true },
          vrf_uuid:   { type: 'string', format: 'uuid', nullable: true },
          vlan_uuid:  { type: 'string', format: 'uuid', nullable: true },
          tenant:     { type: 'string', nullable: true },
          tags:       { type: 'string', nullable: true },
          subnet_uuid: { type: 'string', format: 'uuid' },
        },
      },
      IPUpdate: {
        type: 'object',
        minProperties: 1,
        properties: {
          status:     { type: 'string' },
          hostname:   { type: 'string', nullable: true },
          decription: { type: 'string', nullable: true },
          vrf_uuid:   { type: 'string', format: 'uuid', nullable: true },
          vlan_uuid:  { type: 'string', format: 'uuid', nullable: true },
          is_gateway: { type: 'boolean', nullable: true },
          tags:       { type: 'string', nullable: true },
          tenant:     { type: 'string', nullable: true },
          tenantgroup: { type: 'string', nullable: true },
        },
      },
      VLAN: {
        type: 'object',
        properties: {
          uuid:        { type: 'string', format: 'uuid' },
          name:        { type: 'string' },
          status:      { type: 'string' },
          role:        { type: 'string', nullable: true },
          description: { type: 'string', nullable: true },
          tag:         { type: 'string', nullable: true },
          tenant:      { type: 'string', nullable: true },
          comments:    { type: 'string', nullable: true },
        },
      },
      VLANCreate: {
        type: 'object',
        required: ['name', 'status'],
        properties: {
          name:        { type: 'string' },
          status:      { type: 'string' },
          role:        { type: 'string', nullable: true },
          description: { type: 'string', nullable: true },
          tag:         { type: 'string', nullable: true },
          tenant:      { type: 'string', nullable: true },
          comments:    { type: 'string', nullable: true },
        },
      },
      VRF: {
        type: 'object',
        properties: {
          uuid:         { type: 'string', format: 'uuid' },
          name:         { type: 'string' },
          description:  { type: 'string', nullable: true },
          tag:          { type: 'string', nullable: true },
          tenant:       { type: 'string', nullable: true },
          importtarget: { type: 'string', nullable: true },
          exporttarget: { type: 'string', nullable: true },
          comments:     { type: 'string', nullable: true },
        },
      },
      VRFCreate: {
        type: 'object',
        required: ['name'],
        properties: {
          name:         { type: 'string' },
          description:  { type: 'string', nullable: true },
          tag:          { type: 'string', nullable: true },
          tenant:       { type: 'string', nullable: true },
          importtarget: { type: 'string', nullable: true },
          exporttarget: { type: 'string', nullable: true },
          comments:     { type: 'string', nullable: true },
        },
      },
      Region: {
        type: 'object',
        properties: {
          uuid:        { type: 'string', format: 'uuid' },
          name:        { type: 'string' },
          slug:        { type: 'string' },
          description: { type: 'string', nullable: true },
          tagscsv:     { type: 'string', nullable: true },
          sitescount:  { type: 'integer', nullable: true },
        },
      },
      RegionCreate: {
        type: 'object',
        required: ['name', 'slug'],
        properties: {
          name:       { type: 'string' },
          slug:       { type: 'string', pattern: '^[a-z0-9-]+$' },
          description: { type: 'string', nullable: true },
          tagscsv:    { type: 'string', nullable: true },
          sitescount: { type: 'integer', nullable: true },
        },
      },
      Site: {
        type: 'object',
        properties: {
          uuid:            { type: 'string', format: 'uuid' },
          name:            { type: 'string' },
          slug:            { type: 'string' },
          status:          { type: 'string' },
          region:          { type: 'string', format: 'uuid', nullable: true },
          location:        { type: 'string', format: 'uuid', nullable: true },
          physicaladdress: { type: 'string', nullable: true },
          shippingaddress: { type: 'string', nullable: true },
          tenant:          { type: 'string', nullable: true },
          tenantgroup:     { type: 'string', nullable: true },
          description:     { type: 'string', nullable: true },
          tagscsv:         { type: 'string', nullable: true },
          comments:        { type: 'string', nullable: true },
        },
      },
      SiteCreate: {
        type: 'object',
        required: ['name', 'slug', 'status'],
        properties: {
          name:            { type: 'string' },
          slug:            { type: 'string', pattern: '^[a-z0-9-]+$' },
          status:          { type: 'string' },
          region:          { type: 'string', format: 'uuid', nullable: true },
          location:        { type: 'string', format: 'uuid', nullable: true },
          physicaladdress: { type: 'string', nullable: true },
          shippingaddress: { type: 'string', nullable: true },
          tenant:          { type: 'string', nullable: true },
          tenantgroup:     { type: 'string', nullable: true },
          description:     { type: 'string', nullable: true },
          tagscsv:         { type: 'string', nullable: true },
          comments:        { type: 'string', nullable: true },
        },
      },
      Location: {
        type: 'object',
        properties: {
          uuid:         { type: 'string', format: 'uuid' },
          name:         { type: 'string' },
          slug:         { type: 'string' },
          status:       { type: 'string' },
          site_uuid:    { type: 'string', format: 'uuid' },
          description:  { type: 'string', nullable: true },
          rackscount:   { type: 'integer', nullable: true },
          devicescount: { type: 'integer', nullable: true },
          tenant:       { type: 'string', nullable: true },
          tenantgroup:  { type: 'string', nullable: true },
          tagscsv:      { type: 'string', nullable: true },
        },
      },
      LocationCreate: {
        type: 'object',
        required: ['name', 'slug', 'status', 'site_uuid'],
        properties: {
          name:         { type: 'string' },
          slug:         { type: 'string', pattern: '^[a-z0-9-]+$' },
          status:       { type: 'string' },
          site_uuid:    { type: 'string', format: 'uuid' },
          description:  { type: 'string', nullable: true },
          rackscount:   { type: 'integer', nullable: true },
          devicescount: { type: 'integer', nullable: true },
          tenant:       { type: 'string', nullable: true },
          tenantgroup:  { type: 'string', nullable: true },
          tagscsv:      { type: 'string', nullable: true },
        },
      },
      Manufacturer: {
        type: 'object',
        properties: {
          uuid:        { type: 'string', format: 'uuid' },
          name:        { type: 'string' },
          slug:        { type: 'string' },
          description: { type: 'string', nullable: true },
          tags:        { type: 'string', nullable: true },
        },
      },
      ManufacturerCreate: {
        type: 'object',
        required: ['name', 'slug'],
        properties: {
          name:        { type: 'string' },
          slug:        { type: 'string', pattern: '^[a-z0-9-]+$' },
          description: { type: 'string', nullable: true },
          tags:        { type: 'string', nullable: true },
        },
      },
      Platform: {
        type: 'object',
        properties: {
          uuid:              { type: 'string', format: 'uuid' },
          name:              { type: 'string' },
          slug:              { type: 'string' },
          description:       { type: 'string', nullable: true },
          tags:              { type: 'string', nullable: true },
          manufacturer_uuid: { type: 'string', format: 'uuid', nullable: true },
        },
      },
      PlatformCreate: {
        type: 'object',
        required: ['name', 'slug'],
        properties: {
          name:              { type: 'string' },
          slug:              { type: 'string', pattern: '^[a-z0-9-]+$' },
          description:       { type: 'string', nullable: true },
          tags:              { type: 'string', nullable: true },
          manufacturer_uuid: { type: 'string', format: 'uuid', nullable: true },
        },
      },
      Provider: {
        type: 'object',
        properties: {
          uuid:        { type: 'string', format: 'uuid' },
          name:        { type: 'string' },
          slug:        { type: 'string' },
          description: { type: 'string', nullable: true },
          comments:    { type: 'string', nullable: true },
          asnscsv:     { type: 'string', nullable: true },
          tagscsv:     { type: 'string', nullable: true },
        },
      },
      ProviderCreate: {
        type: 'object',
        required: ['name', 'slug'],
        properties: {
          name:        { type: 'string' },
          slug:        { type: 'string', pattern: '^[a-z0-9-]+$' },
          description: { type: 'string', nullable: true },
          comments:    { type: 'string', nullable: true },
          asnscsv:     { type: 'string', nullable: true },
          tagscsv:     { type: 'string', nullable: true },
        },
      },
      Rack: {
        type: 'object',
        properties: {
          uuid:             { type: 'string', format: 'uuid' },
          name:             { type: 'string' },
          slug:             { type: 'string' },
          status:           { type: 'string' },
          site_uuid:        { type: 'string', format: 'uuid' },
          location_uuid:    { type: 'string', format: 'uuid', nullable: true },
          role:             { type: 'string', nullable: true },
          heightu:          { type: 'integer', nullable: true },
          widthin:          { type: 'integer', nullable: true },
          depth:            { type: 'integer', nullable: true },
          powerutilization: { type: 'integer', nullable: true },
          spaceutilization: { type: 'integer', nullable: true },
          serialnumber:     { type: 'string', nullable: true },
          facilityid:       { type: 'string', nullable: true },
          assettag:         { type: 'string', nullable: true },
          tenant:           { type: 'string', nullable: true },
          tagscsv:          { type: 'string', nullable: true },
          comments:         { type: 'string', nullable: true },
        },
      },
      RackCreate: {
        type: 'object',
        required: ['name', 'slug', 'status', 'site_uuid'],
        properties: {
          name:             { type: 'string' },
          slug:             { type: 'string', pattern: '^[a-z0-9-]+$' },
          status:           { type: 'string' },
          site_uuid:        { type: 'string', format: 'uuid' },
          location_uuid:    { type: 'string', format: 'uuid', nullable: true },
          role:             { type: 'string', nullable: true },
          heightu:          { type: 'integer', minimum: 1, maximum: 100, nullable: true },
          widthin:          { type: 'integer', minimum: 1, nullable: true },
          depth:            { type: 'integer', minimum: 1, nullable: true },
          powerutilization: { type: 'integer', minimum: 0, maximum: 100, nullable: true },
          spaceutilization: { type: 'integer', minimum: 0, maximum: 100, nullable: true },
          serialnumber:     { type: 'string', nullable: true },
          facilityid:       { type: 'string', nullable: true },
          assettag:         { type: 'string', nullable: true },
          tenant:           { type: 'string', nullable: true },
          tagscsv:          { type: 'string', nullable: true },
          comments:         { type: 'string', nullable: true },
        },
      },
      Device: {
        type: 'object',
        properties: {
          uuid:              { type: 'string', format: 'uuid' },
          name:              { type: 'string' },
          devicetype:        { type: 'string' },
          role:              { type: 'string' },
          site_uuid:         { type: 'string', format: 'uuid' },
          manufacturer_uuid: { type: 'string', format: 'uuid', nullable: true },
          platform_uuid:     { type: 'string', format: 'uuid', nullable: true },
          location_uuid:     { type: 'string', format: 'uuid', nullable: true },
          serialno:          { type: 'string', nullable: true },
          assettag:          { type: 'string', nullable: true },
          tenant:            { type: 'string', nullable: true },
          comments:          { type: 'string', nullable: true },
        },
      },
      DeviceCreate: {
        type: 'object',
        required: ['name', 'devicetype', 'role', 'site_uuid'],
        properties: {
          name:              { type: 'string' },
          devicetype:        { type: 'string' },
          role:              { type: 'string' },
          site_uuid:         { type: 'string', format: 'uuid' },
          manufacturer_uuid: { type: 'string', format: 'uuid', nullable: true },
          platform_uuid:     { type: 'string', format: 'uuid', nullable: true },
          location_uuid:     { type: 'string', format: 'uuid', nullable: true },
          serialno:          { type: 'string', nullable: true },
          assettag:          { type: 'string', nullable: true },
          tag:               { type: 'string', nullable: true },
          tenant:            { type: 'string', nullable: true },
          tenantgroup:       { type: 'string', nullable: true },
          airflow:           { type: 'string', nullable: true },
          cluster:           { type: 'string', nullable: true },
          interfaces:        { type: 'string', nullable: true },
          ips:               { type: 'string', nullable: true },
          services:          { type: 'string', nullable: true },
          virtualchassis:    { type: 'string', nullable: true },
          description:       { type: 'string', nullable: true },
          comments:          { type: 'string', nullable: true },
        },
      },
      Interface: {
        type: 'object',
        properties: {
          uuid:        { type: 'string', format: 'uuid' },
          name:        { type: 'string' },
          device_uuid: { type: 'string', format: 'uuid' },
          type:        { type: 'string' },
          mac:         { type: 'string', nullable: true },
          mtu:         { type: 'string', nullable: true },
          speed:       { type: 'string', nullable: true },
          label:       { type: 'string', nullable: true },
          vrf_uuid:    { type: 'string', format: 'uuid', nullable: true },
          description: { type: 'string', nullable: true },
          comments:    { type: 'string', nullable: true },
        },
      },
      InterfaceCreate: {
        type: 'object',
        required: ['name', 'device_uuid', 'type'],
        properties: {
          name:        { type: 'string' },
          device_uuid: { type: 'string', format: 'uuid' },
          type:        { type: 'string' },
          mac:         { type: 'string', nullable: true },
          mtu:         { type: 'string', nullable: true },
          speed:       { type: 'string', nullable: true },
          label:       { type: 'string', nullable: true },
          vrf_uuid:    { type: 'string', format: 'uuid', nullable: true },
          description: { type: 'string', nullable: true },
          comments:    { type: 'string', nullable: true },
        },
      },
      Circuit: {
        type: 'object',
        properties: {
          uuid:            { type: 'string', format: 'uuid' },
          provider_uuid:   { type: 'string', format: 'uuid' },
          type:            { type: 'string' },
          status:          { type: 'string' },
          commitrate:      { type: 'string', nullable: true },
          customerip:      { type: 'string', nullable: true },
          gatewayip:       { type: 'string', nullable: true },
          ordernumber:     { type: 'string', nullable: true },
          provideraccount: { type: 'string', nullable: true },
          installed:       { type: 'string', format: 'date', nullable: true },
          terminates:      { type: 'string', format: 'date', nullable: true },
          tenant:          { type: 'string', nullable: true },
          tags:            { type: 'string', nullable: true },
          description:     { type: 'string', nullable: true },
          comments:        { type: 'string', nullable: true },
        },
      },
      CircuitCreate: {
        type: 'object',
        required: ['provider_uuid', 'type', 'status'],
        properties: {
          provider_uuid:   { type: 'string', format: 'uuid' },
          type:            { type: 'string' },
          status:          { type: 'string' },
          commitrate:      { type: 'string', nullable: true },
          customerip:      { type: 'string', nullable: true },
          gatewayip:       { type: 'string', nullable: true },
          ordernumber:     { type: 'string', nullable: true },
          provideraccount: { type: 'string', nullable: true },
          installed:       { type: 'string', format: 'date', nullable: true },
          terminates:      { type: 'string', format: 'date', nullable: true },
          tenant:          { type: 'string', nullable: true },
          tags:            { type: 'string', nullable: true },
          description:     { type: 'string', nullable: true },
          comments:        { type: 'string', nullable: true },
        },
      },
      Wireless: {
        type: 'object',
        properties: {
          uuid:        { type: 'string', format: 'uuid' },
          ssid:        { type: 'string' },
          status:      { type: 'string' },
          authtype:    { type: 'string', nullable: true },
          authcipher:  { type: 'string', nullable: true },
          vlan_uuid:   { type: 'string', format: 'uuid', nullable: true },
          group:       { type: 'string', nullable: true },
          tenant:      { type: 'string', nullable: true },
          description: { type: 'string', nullable: true },
          comments:    { type: 'string', nullable: true },
        },
      },
      WirelessCreate: {
        type: 'object',
        required: ['ssid', 'status'],
        properties: {
          ssid:        { type: 'string' },
          status:      { type: 'string' },
          authtype:    { type: 'string', nullable: true },
          authcipher:  { type: 'string', nullable: true },
          presharekey: { type: 'string', nullable: true },
          vlan:        { type: 'string', format: 'uuid', nullable: true, description: 'Maps to vlan_uuid in DB.' },
          group:       { type: 'string', nullable: true },
          tenant:      { type: 'string', nullable: true },
          tenantgroup: { type: 'string', nullable: true },
          description: { type: 'string', nullable: true },
          comments:    { type: 'string', nullable: true },
        },
      },
      // ── Assets ────────────────────────────────────────────────────────────────
      Vendor: {
        type: 'object',
        properties: {
          uuid:                 { type: 'string', format: 'uuid' },
          name:                 { type: 'string' },
          vendor_type:          { type: 'string' },
          category:             { type: 'string' },
          internal_owner:       { type: 'string' },
          email:                { type: 'string', format: 'email' },
          status:               { type: 'string', enum: ['Active', 'Inactive'] },
          primary_contact_name: { type: 'string', nullable: true },
          phone:                { type: 'string', nullable: true },
          website:              { type: 'string', format: 'uri', nullable: true },
          vendor_criticality:   { type: 'string', enum: ['Low', 'Medium', 'High', 'Critical'] },
          notes:                { type: 'string', nullable: true },
          attachments:          { type: 'array', items: { type: 'string' }, nullable: true },
        },
      },
      VendorCreate: {
        type: 'object',
        required: ['name', 'vendor_type', 'category', 'internal_owner', 'email'],
        properties: {
          name:                 { type: 'string' },
          vendor_type:          { type: 'string' },
          category:             { type: 'string' },
          internal_owner:       { type: 'string' },
          email:                { type: 'string', format: 'email' },
          status:               { type: 'string', enum: ['Active', 'Inactive'], default: 'Active' },
          primary_contact_name: { type: 'string', nullable: true },
          phone:                { type: 'string', nullable: true },
          website:              { type: 'string', format: 'uri', nullable: true },
          vendor_criticality:   { type: 'string', enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
          notes:                { type: 'string', nullable: true },
          attachments:          { type: 'array', items: { type: 'string' }, nullable: true },
        },
      },
      Contract: {
        type: 'object',
        properties: {
          uuid:             { type: 'string', format: 'uuid' },
          contract_name:    { type: 'string' },
          contract_type:    { type: 'string' },
          vendor_uuid:      { type: 'string', format: 'uuid' },
          status:           { type: 'string' },
          start_date:       { type: 'string', format: 'date', nullable: true },
          end_date:         { type: 'string', format: 'date', nullable: true },
          value:            { type: 'number', minimum: 0 },
          currency:         { type: 'string', example: 'USD' },
          payment_terms:    { type: 'string', nullable: true },
          renewal_type:     { type: 'string', nullable: true },
          notice_period:    { type: 'integer', minimum: 0 },
          renewal_reminder: { type: 'integer', minimum: 0 },
          internal_owner:   { type: 'string', nullable: true },
          linked_assets:    { type: 'array', items: { type: 'string' }, nullable: true },
          linked_licenses:  { type: 'array', items: { type: 'string' }, nullable: true },
          linked_pos:       { type: 'array', items: { type: 'string' }, nullable: true },
          documents:        { type: 'array', items: { type: 'string' }, nullable: true },
          notes:            { type: 'string', nullable: true },
        },
      },
      ContractCreate: {
        type: 'object',
        required: ['contract_name', 'contract_type', 'vendor_uuid'],
        properties: {
          contract_name:    { type: 'string' },
          contract_type:    { type: 'string' },
          vendor_uuid:      { type: 'string', format: 'uuid' },
          status:           { type: 'string', default: 'Active' },
          start_date:       { type: 'string', format: 'date', nullable: true },
          end_date:         { type: 'string', format: 'date', nullable: true },
          value:            { type: 'number', minimum: 0, default: 0 },
          currency:         { type: 'string', default: 'USD' },
          payment_terms:    { type: 'string', nullable: true },
          renewal_type:     { type: 'string', nullable: true },
          notice_period:    { type: 'integer', minimum: 0, default: 0 },
          renewal_reminder: { type: 'integer', minimum: 0, default: 30 },
          internal_owner:   { type: 'string', nullable: true },
          linked_assets:    { type: 'array', items: { type: 'string' }, nullable: true },
          linked_licenses:  { type: 'array', items: { type: 'string' }, nullable: true },
          linked_pos:       { type: 'array', items: { type: 'string' }, nullable: true },
          documents:        { type: 'array', items: { type: 'string' }, nullable: true },
          notes:            { type: 'string', nullable: true },
        },
      },
      PurchaseOrder: {
        type: 'object',
        properties: {
          uuid:               { type: 'string', format: 'uuid' },
          po_id:              { type: 'string' },
          vendor_uuid:        { type: 'string', format: 'uuid' },
          site_uuid:          { type: 'string', format: 'uuid' },
          quantity:           { type: 'integer', minimum: 1 },
          unit_cost:          { type: 'number', minimum: 0 },
          total_value:        { type: 'number', description: 'Generated column: quantity × unit_cost.' },
          status:             { type: 'string', enum: ['DRAFT','SUBMITTED','APPROVED','ORDERED','RECEIVED','PARTIALLY_RECEIVED','CANCELLED'] },
          category:           { type: 'string', nullable: true },
          manufacturer_uuid:  { type: 'string', format: 'uuid', nullable: true },
          model:              { type: 'string', nullable: true },
          purchase_date:      { type: 'string', format: 'date', nullable: true },
          warranty_expiry:    { type: 'string', format: 'date', nullable: true },
          quantity_received:  { type: 'integer', minimum: 0 },
          department:         { type: 'string', nullable: true },
          owner_requester_id: { type: 'string', nullable: true },
        },
      },
      PurchaseOrderCreate: {
        type: 'object',
        required: ['po_id', 'vendor_uuid', 'site_uuid', 'quantity', 'unit_cost'],
        properties: {
          po_id:              { type: 'string', maxLength: 32 },
          vendor_uuid:        { type: 'string', format: 'uuid' },
          site_uuid:          { type: 'string', format: 'uuid' },
          quantity:           { type: 'integer', minimum: 1 },
          unit_cost:          { type: 'number', minimum: 0 },
          status:             { type: 'string', enum: ['DRAFT','SUBMITTED','APPROVED','ORDERED','RECEIVED','PARTIALLY_RECEIVED','CANCELLED'], default: 'DRAFT' },
          category:           { type: 'string', nullable: true },
          manufacturer_uuid:  { type: 'string', format: 'uuid', nullable: true },
          model:              { type: 'string', nullable: true },
          purchase_date:      { type: 'string', format: 'date', nullable: true },
          warranty_expiry:    { type: 'string', format: 'date', nullable: true },
          quantity_received:  { type: 'integer', minimum: 0, default: 0 },
          department:         { type: 'string', nullable: true },
          owner_requester_id: { type: 'string', nullable: true },
        },
      },
      Asset: {
        type: 'object',
        properties: {
          uuid:                  { type: 'string', format: 'uuid' },
          asset_id:              { type: 'string' },
          category:              { type: 'string' },
          site_uuid:             { type: 'string', format: 'uuid' },
          status:                { type: 'string' },
          manufacturer_uuid:     { type: 'string', format: 'uuid', nullable: true },
          model:                 { type: 'string', nullable: true },
          serial_no:             { type: 'string', nullable: true },
          department:            { type: 'string', nullable: true },
          assigned_to:           { type: 'string', nullable: true },
          cost_center:           { type: 'string', nullable: true },
          purchase_order_uuid:   { type: 'string', format: 'uuid', nullable: true },
          purchase_date:         { type: 'string', format: 'date', nullable: true },
          warranty_expiry:       { type: 'string', format: 'date', nullable: true },
          expected_eol:          { type: 'string', format: 'date', nullable: true },
          purchase_cost:         { type: 'number', minimum: 0, nullable: true },
          depreciation_method:   { type: 'string', nullable: true },
          depreciation_rate_pct: { type: 'number', minimum: 0, maximum: 100, nullable: true },
          qr_code_url:           { type: 'string', nullable: true },
          qr_code_generated_at:  { type: 'string', format: 'date-time', nullable: true },
          document_url:          { type: 'string', nullable: true },
        },
      },
      AssetCreate: {
        type: 'object',
        required: ['asset_id', 'category', 'site_uuid', 'status'],
        properties: {
          asset_id:              { type: 'string', maxLength: 64 },
          category:              { type: 'string' },
          site_uuid:             { type: 'string', format: 'uuid' },
          status:                { type: 'string' },
          manufacturer_uuid:     { type: 'string', format: 'uuid', nullable: true },
          model:                 { type: 'string', nullable: true },
          serial_no:             { type: 'string', nullable: true },
          department:            { type: 'string', nullable: true },
          assigned_to:           { type: 'string', nullable: true },
          cost_center:           { type: 'string', nullable: true },
          purchase_order_uuid:   { type: 'string', format: 'uuid', nullable: true },
          purchase_date:         { type: 'string', format: 'date', nullable: true },
          warranty_expiry:       { type: 'string', format: 'date', nullable: true },
          expected_eol:          { type: 'string', format: 'date', nullable: true },
          purchase_cost:         { type: 'number', minimum: 0, nullable: true },
          depreciation_method:   { type: 'string', nullable: true },
          depreciation_rate_pct: { type: 'number', minimum: 0, maximum: 100, nullable: true },
        },
      },
      // ── Activity Logs ─────────────────────────────────────────────────────────
      ActivityLog: {
        type: 'object',
        properties: {
          event_id:       { type: 'string', format: 'uuid' },
          orgid:          { type: 'string' },
          module:         { type: 'string', enum: ['core','alerts','ams','ipam','system','dcim'] },
          category:       { type: 'string', enum: ['security','governance','operational','config','automation','billing'] },
          event_type:     { type: 'string' },
          event_label:    { type: 'string' },
          severity:       { type: 'string', enum: ['info','warning','critical'] },
          outcome:        { type: 'string', enum: ['success','failed','denied','partial','pending'] },
          actor_type:     { type: 'string', enum: ['user','service_account','integration','system'] },
          actor_id:       { type: 'string', nullable: true },
          actor_display:  { type: 'string', nullable: true },
          target_type:    { type: 'string', nullable: true },
          target_id:      { type: 'string', nullable: true },
          target_display: { type: 'string', nullable: true },
          source:         { type: 'string', nullable: true },
          ip_address:     { type: 'string', nullable: true },
          correlation_id: { type: 'string', nullable: true },
          metadata:       { type: 'object', nullable: true },
          changes:        { type: 'object', nullable: true },
          created_at:     { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  security: [{ BearerAuth: [] }],
  tags: [
    { name: 'Health',        description: 'Server health check (unauthenticated)' },
    { name: 'Prefixes',      description: 'IP prefix (network) management' },
    { name: 'Subnets',       description: 'Subnet management (nested under prefixes)' },
    { name: 'IPs',           description: 'IP address management (nested under subnets)' },
    { name: 'VLANs',         description: 'VLAN management' },
    { name: 'VRFs',          description: 'VRF management' },
    { name: 'Regions',       description: 'Geographic region management' },
    { name: 'Sites',         description: 'Physical site management' },
    { name: 'Locations',     description: 'Location management (within sites)' },
    { name: 'Manufacturers', description: 'Hardware manufacturer management' },
    { name: 'Platforms',     description: 'OS/platform management' },
    { name: 'Providers',     description: 'Circuit provider management' },
    { name: 'Racks',         description: 'Rack management' },
    { name: 'Devices',       description: 'Network device management' },
    { name: 'Interfaces',    description: 'Device interface management' },
    { name: 'Circuits',      description: 'WAN circuit management' },
    { name: 'Wireless',      description: 'Wireless LAN management' },
    { name: 'Vendors',       description: 'Vendor management (assets module)' },
    { name: 'Contracts',     description: 'Contract management' },
    { name: 'Purchase Orders', description: 'Purchase order management' },
    { name: 'Assets',        description: 'IT asset management' },
    { name: 'Activity Logs', description: 'Immutable audit log — no update/delete' },
  ],
  paths: {
    // ── Health ────────────────────────────────────────────────────────────────
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Server health check',
        security: [],
        responses: {
          200: {
            description: 'Server and DB are healthy.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status:    { type: 'string', example: 'ok' },
                    uptime:    { type: 'number' },
                    database:  { type: 'string', example: 'ok' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          503: { description: 'Database unreachable.' },
        },
      },
    },

    // ── Prefixes ──────────────────────────────────────────────────────────────
    '/api/ipam/prefixes': {
      parameters: [{ $ref: '#/components/parameters/OrgId' }],
      get: {
        tags: ['Prefixes'],
        summary: 'List prefixes',
        parameters: [
          { $ref: '#/components/parameters/PageQuery' },
          { $ref: '#/components/parameters/PageSizeQuery' },
        ],
        responses: {
          200: {
            description: 'Paginated list of prefixes.',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/PaginatedMeta' },
                    { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Prefix' } } } },
                  ],
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Prefixes'],
        summary: 'Create prefix',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/PrefixCreate' } } },
        },
        responses: {
          201: { description: 'Prefix created.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Prefix' } } } },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/ipam/prefixes/{id}': {
      parameters: [
        { $ref: '#/components/parameters/OrgId' },
        { $ref: '#/components/parameters/UuidPath' },
      ],
      get: {
        tags: ['Prefixes'],
        summary: 'Get prefix by ID',
        responses: {
          200: { description: 'Prefix.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Prefix' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Prefixes'],
        summary: 'Update prefix',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', minProperties: 1 } } },
        },
        responses: {
          200: { description: 'Updated prefix.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Prefix' } } } },
          400: { $ref: '#/components/responses/ValidationError' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Prefixes'],
        summary: 'Soft-delete prefix',
        responses: {
          200: { description: 'Prefix deleted.' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ── Subnets ───────────────────────────────────────────────────────────────
    '/api/ipam/prefixes/{id}/subnets': {
      parameters: [
        { $ref: '#/components/parameters/OrgId' },
        { $ref: '#/components/parameters/UuidPath' },
      ],
      get: {
        tags: ['Subnets'],
        summary: 'List subnets under a prefix',
        responses: {
          200: { description: 'List of subnets.', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Subnet' } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Subnets'],
        summary: 'Create subnet under a prefix',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SubnetCreate' } } },
        },
        responses: {
          201: { description: 'Subnet created.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Subnet' } } } },
          400: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/api/ipam/prefixes/{id}/subnets/{subnetId}': {
      parameters: [
        { $ref: '#/components/parameters/OrgId' },
        { $ref: '#/components/parameters/UuidPath' },
        { name: 'subnetId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      put: {
        tags: ['Subnets'],
        summary: 'Update subnet',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', minProperties: 1 } } },
        },
        responses: {
          200: { description: 'Updated subnet.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Subnet' } } } },
          400: { $ref: '#/components/responses/ValidationError' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Subnets'],
        summary: 'Soft-delete subnet',
        responses: {
          200: { description: 'Subnet deleted.' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ── IPs ───────────────────────────────────────────────────────────────────
    '/api/ipam/prefixes/{id}/subnets/{subnetId}/ips': {
      parameters: [
        { $ref: '#/components/parameters/OrgId' },
        { $ref: '#/components/parameters/UuidPath' },
        { name: 'subnetId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      get: {
        tags: ['IPs'],
        summary: 'List IPs in a subnet',
        responses: {
          200: { description: 'List of IPs.', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/IP' } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/ipam/prefixes/{id}/subnets/{subnetId}/ips/{ipId}': {
      parameters: [
        { $ref: '#/components/parameters/OrgId' },
        { $ref: '#/components/parameters/UuidPath' },
        { name: 'subnetId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        { name: 'ipId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      put: {
        tags: ['IPs'],
        summary: 'Update IP address record',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/IPUpdate' } } },
        },
        responses: {
          200: { description: 'Updated IP.', content: { 'application/json': { schema: { $ref: '#/components/schemas/IP' } } } },
          400: { $ref: '#/components/responses/ValidationError' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ── VLANs ─────────────────────────────────────────────────────────────────
    '/api/ipam/vlans': {
      parameters: [{ $ref: '#/components/parameters/OrgId' }],
      get: {
        tags: ['VLANs'],
        summary: 'List VLANs',
        parameters: [{ $ref: '#/components/parameters/PageQuery' }, { $ref: '#/components/parameters/PageSizeQuery' }],
        responses: { 200: { description: 'Paginated VLANs.', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/VLAN' } } } } } },
      },
      post: {
        tags: ['VLANs'],
        summary: 'Create VLAN',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/VLANCreate' } } } },
        responses: {
          201: { description: 'VLAN created.', content: { 'application/json': { schema: { $ref: '#/components/schemas/VLAN' } } } },
          400: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/api/ipam/vlans/{id}': {
      parameters: [{ $ref: '#/components/parameters/OrgId' }, { $ref: '#/components/parameters/UuidPath' }],
      get:    { tags: ['VLANs'], summary: 'Get VLAN', responses: { 200: { description: 'VLAN.', content: { 'application/json': { schema: { $ref: '#/components/schemas/VLAN' } } } }, 404: { $ref: '#/components/responses/NotFound' } } },
      put:    { tags: ['VLANs'], summary: 'Update VLAN', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', minProperties: 1 } } } }, responses: { 200: { description: 'Updated VLAN.' }, 404: { $ref: '#/components/responses/NotFound' } } },
      delete: { tags: ['VLANs'], summary: 'Soft-delete VLAN', responses: { 200: { description: 'VLAN deleted.' }, 404: { $ref: '#/components/responses/NotFound' } } },
    },

    // ── VRFs ──────────────────────────────────────────────────────────────────
    '/api/ipam/vrfs': {
      parameters: [{ $ref: '#/components/parameters/OrgId' }],
      get:  { tags: ['VRFs'], summary: 'List VRFs', parameters: [{ $ref: '#/components/parameters/PageQuery' }, { $ref: '#/components/parameters/PageSizeQuery' }], responses: { 200: { description: 'Paginated VRFs.' } } },
      post: { tags: ['VRFs'], summary: 'Create VRF', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/VRFCreate' } } } }, responses: { 201: { description: 'VRF created.' }, 400: { $ref: '#/components/responses/ValidationError' } } },
    },
    '/api/ipam/vrfs/{id}': {
      parameters: [{ $ref: '#/components/parameters/OrgId' }, { $ref: '#/components/parameters/UuidPath' }],
      get:    { tags: ['VRFs'], summary: 'Get VRF', responses: { 200: { description: 'VRF.' }, 404: { $ref: '#/components/responses/NotFound' } } },
      put:    { tags: ['VRFs'], summary: 'Update VRF', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', minProperties: 1 } } } }, responses: { 200: { description: 'Updated VRF.' } } },
      delete: { tags: ['VRFs'], summary: 'Soft-delete VRF', responses: { 200: { description: 'VRF deleted.' } } },
    },

    // ── Regions ───────────────────────────────────────────────────────────────
    '/api/ipam/regions': {
      parameters: [{ $ref: '#/components/parameters/OrgId' }],
      get:  { tags: ['Regions'], summary: 'List regions', parameters: [{ $ref: '#/components/parameters/PageQuery' }, { $ref: '#/components/parameters/PageSizeQuery' }], responses: { 200: { description: 'Paginated regions.' } } },
      post: { tags: ['Regions'], summary: 'Create region', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RegionCreate' } } } }, responses: { 201: { description: 'Region created.' }, 400: { $ref: '#/components/responses/ValidationError' } } },
    },
    '/api/ipam/regions/{id}': {
      parameters: [{ $ref: '#/components/parameters/OrgId' }, { $ref: '#/components/parameters/UuidPath' }],
      get:    { tags: ['Regions'], summary: 'Get region', responses: { 200: { description: 'Region.' }, 404: { $ref: '#/components/responses/NotFound' } } },
      put:    { tags: ['Regions'], summary: 'Update region', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', minProperties: 1 } } } }, responses: { 200: { description: 'Updated region.' } } },
      delete: { tags: ['Regions'], summary: 'Soft-delete region', responses: { 200: { description: 'Region deleted.' } } },
    },

    // ── Sites ─────────────────────────────────────────────────────────────────
    '/api/ipam/sites': {
      parameters: [{ $ref: '#/components/parameters/OrgId' }],
      get:  { tags: ['Sites'], summary: 'List sites', parameters: [{ $ref: '#/components/parameters/PageQuery' }, { $ref: '#/components/parameters/PageSizeQuery' }], responses: { 200: { description: 'Paginated sites.' } } },
      post: { tags: ['Sites'], summary: 'Create site', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SiteCreate' } } } }, responses: { 201: { description: 'Site created.' }, 400: { $ref: '#/components/responses/ValidationError' } } },
    },
    '/api/ipam/sites/{id}': {
      parameters: [{ $ref: '#/components/parameters/OrgId' }, { $ref: '#/components/parameters/UuidPath' }],
      get:    { tags: ['Sites'], summary: 'Get site', responses: { 200: { description: 'Site.' }, 404: { $ref: '#/components/responses/NotFound' } } },
      put:    { tags: ['Sites'], summary: 'Update site', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', minProperties: 1 } } } }, responses: { 200: { description: 'Updated site.' } } },
      delete: { tags: ['Sites'], summary: 'Soft-delete site', responses: { 200: { description: 'Site deleted.' } } },
    },

    // ── Locations ─────────────────────────────────────────────────────────────
    '/api/ipam/locations': {
      parameters: [{ $ref: '#/components/parameters/OrgId' }],
      get:  { tags: ['Locations'], summary: 'List locations', parameters: [{ $ref: '#/components/parameters/PageQuery' }, { $ref: '#/components/parameters/PageSizeQuery' }], responses: { 200: { description: 'Paginated locations.' } } },
      post: { tags: ['Locations'], summary: 'Create location', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LocationCreate' } } } }, responses: { 201: { description: 'Location created.' }, 400: { $ref: '#/components/responses/ValidationError' } } },
    },
    '/api/ipam/locations/{id}': {
      parameters: [{ $ref: '#/components/parameters/OrgId' }, { $ref: '#/components/parameters/UuidPath' }],
      get:    { tags: ['Locations'], summary: 'Get location', responses: { 200: { description: 'Location.' }, 404: { $ref: '#/components/responses/NotFound' } } },
      put:    { tags: ['Locations'], summary: 'Update location', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', minProperties: 1 } } } }, responses: { 200: { description: 'Updated location.' } } },
      delete: { tags: ['Locations'], summary: 'Soft-delete location', responses: { 200: { description: 'Location deleted.' } } },
    },

    // ── Manufacturers ─────────────────────────────────────────────────────────
    '/api/ipam/manufacturers': {
      parameters: [{ $ref: '#/components/parameters/OrgId' }],
      get:  { tags: ['Manufacturers'], summary: 'List manufacturers', parameters: [{ $ref: '#/components/parameters/PageQuery' }, { $ref: '#/components/parameters/PageSizeQuery' }], responses: { 200: { description: 'Paginated manufacturers.' } } },
      post: { tags: ['Manufacturers'], summary: 'Create manufacturer', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ManufacturerCreate' } } } }, responses: { 201: { description: 'Manufacturer created.' }, 400: { $ref: '#/components/responses/ValidationError' } } },
    },
    '/api/ipam/manufacturers/{id}': {
      parameters: [{ $ref: '#/components/parameters/OrgId' }, { $ref: '#/components/parameters/UuidPath' }],
      get:    { tags: ['Manufacturers'], summary: 'Get manufacturer', responses: { 200: { description: 'Manufacturer.' }, 404: { $ref: '#/components/responses/NotFound' } } },
      put:    { tags: ['Manufacturers'], summary: 'Update manufacturer', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', minProperties: 1 } } } }, responses: { 200: { description: 'Updated manufacturer.' } } },
      delete: { tags: ['Manufacturers'], summary: 'Soft-delete manufacturer', responses: { 200: { description: 'Manufacturer deleted.' } } },
    },

    // ── Platforms ─────────────────────────────────────────────────────────────
    '/api/ipam/platforms': {
      parameters: [{ $ref: '#/components/parameters/OrgId' }],
      get:  { tags: ['Platforms'], summary: 'List platforms', parameters: [{ $ref: '#/components/parameters/PageQuery' }, { $ref: '#/components/parameters/PageSizeQuery' }], responses: { 200: { description: 'Paginated platforms.' } } },
      post: { tags: ['Platforms'], summary: 'Create platform', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/PlatformCreate' } } } }, responses: { 201: { description: 'Platform created.' }, 400: { $ref: '#/components/responses/ValidationError' } } },
    },
    '/api/ipam/platforms/{id}': {
      parameters: [{ $ref: '#/components/parameters/OrgId' }, { $ref: '#/components/parameters/UuidPath' }],
      get:    { tags: ['Platforms'], summary: 'Get platform', responses: { 200: { description: 'Platform.' }, 404: { $ref: '#/components/responses/NotFound' } } },
      put:    { tags: ['Platforms'], summary: 'Update platform', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', minProperties: 1 } } } }, responses: { 200: { description: 'Updated platform.' } } },
      delete: { tags: ['Platforms'], summary: 'Soft-delete platform', responses: { 200: { description: 'Platform deleted.' } } },
    },

    // ── Providers ─────────────────────────────────────────────────────────────
    '/api/ipam/providers': {
      parameters: [{ $ref: '#/components/parameters/OrgId' }],
      get:  { tags: ['Providers'], summary: 'List providers', parameters: [{ $ref: '#/components/parameters/PageQuery' }, { $ref: '#/components/parameters/PageSizeQuery' }], responses: { 200: { description: 'Paginated providers.' } } },
      post: { tags: ['Providers'], summary: 'Create provider', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ProviderCreate' } } } }, responses: { 201: { description: 'Provider created.' }, 400: { $ref: '#/components/responses/ValidationError' } } },
    },
    '/api/ipam/providers/{id}': {
      parameters: [{ $ref: '#/components/parameters/OrgId' }, { $ref: '#/components/parameters/UuidPath' }],
      get:    { tags: ['Providers'], summary: 'Get provider', responses: { 200: { description: 'Provider.' }, 404: { $ref: '#/components/responses/NotFound' } } },
      put:    { tags: ['Providers'], summary: 'Update provider', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', minProperties: 1 } } } }, responses: { 200: { description: 'Updated provider.' } } },
      delete: { tags: ['Providers'], summary: 'Soft-delete provider', responses: { 200: { description: 'Provider deleted.' } } },
    },

    // ── Racks ─────────────────────────────────────────────────────────────────
    '/api/ipam/racks': {
      parameters: [{ $ref: '#/components/parameters/OrgId' }],
      get:  { tags: ['Racks'], summary: 'List racks', parameters: [{ $ref: '#/components/parameters/PageQuery' }, { $ref: '#/components/parameters/PageSizeQuery' }], responses: { 200: { description: 'Paginated racks.' } } },
      post: { tags: ['Racks'], summary: 'Create rack', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RackCreate' } } } }, responses: { 201: { description: 'Rack created.' }, 400: { $ref: '#/components/responses/ValidationError' } } },
    },
    '/api/ipam/racks/{id}': {
      parameters: [{ $ref: '#/components/parameters/OrgId' }, { $ref: '#/components/parameters/UuidPath' }],
      get:    { tags: ['Racks'], summary: 'Get rack', responses: { 200: { description: 'Rack.' }, 404: { $ref: '#/components/responses/NotFound' } } },
      put:    { tags: ['Racks'], summary: 'Update rack', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', minProperties: 1 } } } }, responses: { 200: { description: 'Updated rack.' } } },
      delete: { tags: ['Racks'], summary: 'Soft-delete rack', responses: { 200: { description: 'Rack deleted.' } } },
    },

    // ── Devices ───────────────────────────────────────────────────────────────
    '/api/ipam/devices': {
      parameters: [{ $ref: '#/components/parameters/OrgId' }],
      get:  { tags: ['Devices'], summary: 'List devices', parameters: [{ $ref: '#/components/parameters/PageQuery' }, { $ref: '#/components/parameters/PageSizeQuery' }], responses: { 200: { description: 'Paginated devices.' } } },
      post: { tags: ['Devices'], summary: 'Create device', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/DeviceCreate' } } } }, responses: { 201: { description: 'Device created.' }, 400: { $ref: '#/components/responses/ValidationError' } } },
    },
    '/api/ipam/devices/{id}': {
      parameters: [{ $ref: '#/components/parameters/OrgId' }, { $ref: '#/components/parameters/UuidPath' }],
      get:    { tags: ['Devices'], summary: 'Get device', responses: { 200: { description: 'Device.' }, 404: { $ref: '#/components/responses/NotFound' } } },
      put:    { tags: ['Devices'], summary: 'Update device', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', minProperties: 1 } } } }, responses: { 200: { description: 'Updated device.' } } },
      delete: { tags: ['Devices'], summary: 'Soft-delete device', responses: { 200: { description: 'Device deleted.' } } },
    },

    // ── Interfaces ────────────────────────────────────────────────────────────
    '/api/ipam/interfaces': {
      parameters: [{ $ref: '#/components/parameters/OrgId' }],
      get:  { tags: ['Interfaces'], summary: 'List interfaces', parameters: [{ $ref: '#/components/parameters/PageQuery' }, { $ref: '#/components/parameters/PageSizeQuery' }], responses: { 200: { description: 'Paginated interfaces.' } } },
      post: { tags: ['Interfaces'], summary: 'Create interface', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/InterfaceCreate' } } } }, responses: { 201: { description: 'Interface created.' }, 400: { $ref: '#/components/responses/ValidationError' } } },
    },
    '/api/ipam/interfaces/{id}': {
      parameters: [{ $ref: '#/components/parameters/OrgId' }, { $ref: '#/components/parameters/UuidPath' }],
      get:    { tags: ['Interfaces'], summary: 'Get interface', responses: { 200: { description: 'Interface.' }, 404: { $ref: '#/components/responses/NotFound' } } },
      put:    { tags: ['Interfaces'], summary: 'Update interface', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', minProperties: 1 } } } }, responses: { 200: { description: 'Updated interface.' } } },
      delete: { tags: ['Interfaces'], summary: 'Soft-delete interface', responses: { 200: { description: 'Interface deleted.' } } },
    },

    // ── Circuits ──────────────────────────────────────────────────────────────
    '/api/ipam/circuits': {
      parameters: [{ $ref: '#/components/parameters/OrgId' }],
      get:  { tags: ['Circuits'], summary: 'List circuits', parameters: [{ $ref: '#/components/parameters/PageQuery' }, { $ref: '#/components/parameters/PageSizeQuery' }], responses: { 200: { description: 'Paginated circuits.' } } },
      post: { tags: ['Circuits'], summary: 'Create circuit', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CircuitCreate' } } } }, responses: { 201: { description: 'Circuit created.' }, 400: { $ref: '#/components/responses/ValidationError' } } },
    },
    '/api/ipam/circuits/{id}': {
      parameters: [{ $ref: '#/components/parameters/OrgId' }, { $ref: '#/components/parameters/UuidPath' }],
      get:    { tags: ['Circuits'], summary: 'Get circuit', responses: { 200: { description: 'Circuit.' }, 404: { $ref: '#/components/responses/NotFound' } } },
      put:    { tags: ['Circuits'], summary: 'Update circuit', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', minProperties: 1 } } } }, responses: { 200: { description: 'Updated circuit.' } } },
      delete: { tags: ['Circuits'], summary: 'Soft-delete circuit', responses: { 200: { description: 'Circuit deleted.' } } },
    },

    // ── Wireless ──────────────────────────────────────────────────────────────
    '/api/ipam/wireless': {
      parameters: [{ $ref: '#/components/parameters/OrgId' }],
      get:  { tags: ['Wireless'], summary: 'List wireless LANs', parameters: [{ $ref: '#/components/parameters/PageQuery' }, { $ref: '#/components/parameters/PageSizeQuery' }], responses: { 200: { description: 'Paginated wireless LANs.' } } },
      post: { tags: ['Wireless'], summary: 'Create wireless LAN', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/WirelessCreate' } } } }, responses: { 201: { description: 'Wireless LAN created.' }, 400: { $ref: '#/components/responses/ValidationError' } } },
    },
    '/api/ipam/wireless/{id}': {
      parameters: [{ $ref: '#/components/parameters/OrgId' }, { $ref: '#/components/parameters/UuidPath' }],
      get:    { tags: ['Wireless'], summary: 'Get wireless LAN', responses: { 200: { description: 'Wireless LAN.' }, 404: { $ref: '#/components/responses/NotFound' } } },
      put:    { tags: ['Wireless'], summary: 'Update wireless LAN', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', minProperties: 1 } } } }, responses: { 200: { description: 'Updated wireless LAN.' } } },
      delete: { tags: ['Wireless'], summary: 'Soft-delete wireless LAN', responses: { 200: { description: 'Wireless LAN deleted.' } } },
    },

    // ── Vendors ───────────────────────────────────────────────────────────────
    '/api/assets/vendors': {
      parameters: [{ $ref: '#/components/parameters/OrgId' }],
      get:  { tags: ['Vendors'], summary: 'List vendors', parameters: [{ $ref: '#/components/parameters/PageQuery' }, { $ref: '#/components/parameters/PageSizeQuery' }], responses: { 200: { description: 'Paginated vendors.' } } },
      post: { tags: ['Vendors'], summary: 'Create vendor', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/VendorCreate' } } } }, responses: { 201: { description: 'Vendor created.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Vendor' } } } }, 400: { $ref: '#/components/responses/ValidationError' } } },
    },
    '/api/assets/vendors/{id}': {
      parameters: [{ $ref: '#/components/parameters/OrgId' }, { $ref: '#/components/parameters/UuidPath' }],
      get:    { tags: ['Vendors'], summary: 'Get vendor', responses: { 200: { description: 'Vendor.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Vendor' } } } }, 404: { $ref: '#/components/responses/NotFound' } } },
      put:    { tags: ['Vendors'], summary: 'Update vendor', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', minProperties: 1 } } } }, responses: { 200: { description: 'Updated vendor.' }, 404: { $ref: '#/components/responses/NotFound' } } },
      delete: { tags: ['Vendors'], summary: 'Soft-delete vendor', responses: { 200: { description: 'Vendor deleted.' }, 404: { $ref: '#/components/responses/NotFound' } } },
    },

    // ── Contracts ─────────────────────────────────────────────────────────────
    '/api/assets/contracts': {
      parameters: [{ $ref: '#/components/parameters/OrgId' }],
      get:  { tags: ['Contracts'], summary: 'List contracts', parameters: [{ $ref: '#/components/parameters/PageQuery' }, { $ref: '#/components/parameters/PageSizeQuery' }], responses: { 200: { description: 'Paginated contracts.' } } },
      post: { tags: ['Contracts'], summary: 'Create contract', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ContractCreate' } } } }, responses: { 201: { description: 'Contract created.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Contract' } } } }, 400: { $ref: '#/components/responses/ValidationError' } } },
    },
    '/api/assets/contracts/{id}': {
      parameters: [{ $ref: '#/components/parameters/OrgId' }, { $ref: '#/components/parameters/UuidPath' }],
      get:    { tags: ['Contracts'], summary: 'Get contract', responses: { 200: { description: 'Contract.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Contract' } } } }, 404: { $ref: '#/components/responses/NotFound' } } },
      put:    { tags: ['Contracts'], summary: 'Update contract', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', minProperties: 1 } } } }, responses: { 200: { description: 'Updated contract.' }, 404: { $ref: '#/components/responses/NotFound' } } },
      delete: { tags: ['Contracts'], summary: 'Soft-delete contract', responses: { 200: { description: 'Contract deleted.' }, 404: { $ref: '#/components/responses/NotFound' } } },
    },

    // ── Purchase Orders ───────────────────────────────────────────────────────
    '/api/assets/po': {
      parameters: [{ $ref: '#/components/parameters/OrgId' }],
      get: {
        tags: ['Purchase Orders'],
        summary: 'List purchase orders',
        parameters: [{ $ref: '#/components/parameters/PageQuery' }, { $ref: '#/components/parameters/PageSizeQuery' }],
        responses: { 200: { description: 'Paginated purchase orders.' } },
      },
      post: {
        tags: ['Purchase Orders'],
        summary: 'Create purchase order',
        description: 'Accepts `multipart/form-data` with an optional `document_file` field (PDF/DOC/XLS/image, max 10 MB). All other fields are form fields or JSON.',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/PurchaseOrderCreate' },
                  { type: 'object', properties: { document_file: { type: 'string', format: 'binary', description: 'Optional document upload.' } } },
                ],
              },
            },
          },
        },
        responses: {
          201: { description: 'Purchase order created.', content: { 'application/json': { schema: { $ref: '#/components/schemas/PurchaseOrder' } } } },
          400: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/api/assets/po/{id}': {
      parameters: [{ $ref: '#/components/parameters/OrgId' }, { $ref: '#/components/parameters/UuidPath' }],
      get:    { tags: ['Purchase Orders'], summary: 'Get purchase order', responses: { 200: { description: 'Purchase order.', content: { 'application/json': { schema: { $ref: '#/components/schemas/PurchaseOrder' } } } }, 404: { $ref: '#/components/responses/NotFound' } } },
      put:    { tags: ['Purchase Orders'], summary: 'Update purchase order', description: 'Accepts `multipart/form-data` with optional `document_file`. `total_value` is server-managed and must not be sent.', requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', minProperties: 1 } } } }, responses: { 200: { description: 'Updated PO.' }, 404: { $ref: '#/components/responses/NotFound' } } },
      delete: { tags: ['Purchase Orders'], summary: 'Soft-delete purchase order', responses: { 200: { description: 'PO deleted.' }, 404: { $ref: '#/components/responses/NotFound' } } },
    },

    // ── Assets ────────────────────────────────────────────────────────────────
    '/api/assets': {
      parameters: [{ $ref: '#/components/parameters/OrgId' }],
      get: {
        tags: ['Assets'],
        summary: 'List assets',
        parameters: [{ $ref: '#/components/parameters/PageQuery' }, { $ref: '#/components/parameters/PageSizeQuery' }],
        responses: { 200: { description: 'Paginated assets.' } },
      },
      post: {
        tags: ['Assets'],
        summary: 'Create asset',
        description: 'Accepts `multipart/form-data`. Optional `document_file` field (max 10 MB). A QR code is auto-generated after creation.',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/AssetCreate' },
                  { type: 'object', properties: { document_file: { type: 'string', format: 'binary' } } },
                ],
              },
            },
          },
        },
        responses: {
          201: { description: 'Asset created.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Asset' } } } },
          400: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/api/assets/{id}': {
      parameters: [{ $ref: '#/components/parameters/OrgId' }, { $ref: '#/components/parameters/UuidPath' }],
      get:    { tags: ['Assets'], summary: 'Get asset', responses: { 200: { description: 'Asset.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Asset' } } } }, 404: { $ref: '#/components/responses/NotFound' } } },
      put:    { tags: ['Assets'], summary: 'Update asset', description: 'Accepts `multipart/form-data` with optional `document_file`.', requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', minProperties: 1 } } } }, responses: { 200: { description: 'Updated asset.' }, 404: { $ref: '#/components/responses/NotFound' } } },
      delete: { tags: ['Assets'], summary: 'Soft-delete asset', responses: { 200: { description: 'Asset deleted.' }, 404: { $ref: '#/components/responses/NotFound' } } },
    },

    // ── Activity Logs ─────────────────────────────────────────────────────────
    '/api/activity-logs': {
      parameters: [{ $ref: '#/components/parameters/OrgId' }],
      post: {
        tags: ['Activity Logs'],
        summary: 'Write an activity log event',
        description: 'Inserts an immutable log entry. The table has no update or delete endpoints.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['module', 'category', 'event_type', 'event_label'],
                properties: {
                  module:        { type: 'string', enum: ['core','alerts','ams','ipam','system','dcim'] },
                  category:      { type: 'string', enum: ['security','governance','operational','config','automation','billing'] },
                  event_type:    { type: 'string', maxLength: 100 },
                  event_label:   { type: 'string', maxLength: 255 },
                  severity:      { type: 'string', enum: ['info','warning','critical'], default: 'info' },
                  outcome:       { type: 'string', enum: ['success','failed','denied','partial','pending'], default: 'success' },
                  actor_type:    { type: 'string', enum: ['user','service_account','integration','system'], default: 'user' },
                  actor_id:      { type: 'string', nullable: true },
                  actor_display: { type: 'string', nullable: true },
                  target_type:   { type: 'string', nullable: true },
                  target_id:     { type: 'string', nullable: true },
                  target_display: { type: 'string', nullable: true },
                  source:        { type: 'string', nullable: true },
                  ip_address:    { type: 'string', nullable: true },
                  correlation_id: { type: 'string', nullable: true },
                  metadata:      { type: 'object', nullable: true },
                  changes:       { type: 'object', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Log event recorded.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ActivityLog' } } } },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/activity-logs/query': {
      parameters: [{ $ref: '#/components/parameters/OrgId' }],
      post: {
        tags: ['Activity Logs'],
        summary: 'Query activity logs with filters',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  page:           { type: 'integer', minimum: 1, default: 1 },
                  page_size:      { type: 'integer', minimum: 1, maximum: 100, default: 50 },
                  from:           { type: 'string', format: 'date', nullable: true },
                  to:             { type: 'string', format: 'date', nullable: true },
                  module:         { type: 'string', enum: ['core','alerts','ams','ipam','system','dcim'], nullable: true },
                  categories:     { type: 'array', items: { type: 'string' }, nullable: true },
                  severities:     { type: 'array', items: { type: 'string' }, nullable: true },
                  actor_type:     { type: 'string', enum: ['user','service_account','integration','system'], nullable: true },
                  actor_search:   { type: 'string', nullable: true },
                  event_types:    { type: 'array', items: { type: 'string' }, nullable: true },
                  target_type:    { type: 'string', nullable: true },
                  target_search:  { type: 'string', nullable: true },
                  outcome:        { type: 'string', nullable: true },
                  source:         { type: 'string', nullable: true },
                  correlation_id: { type: 'string', nullable: true },
                  ip_address:     { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Filtered, paginated activity logs.',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/PaginatedMeta' },
                    { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/ActivityLog' } } } },
                  ],
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
  },
};

// swagger-jsdoc wraps an existing spec — we pass our full spec directly
// and use `definition` to satisfy the library's interface.
const options = {
  definition: spec,
  apis: [], // no JSDoc scanning needed — spec is fully defined above
};

module.exports = swaggerJsdoc(options);
