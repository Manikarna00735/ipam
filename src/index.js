require('dotenv').config();
const express = require('express');
const http = require('http');
const { randomUUID } = require('crypto');
const { Server } = require('socket.io');
const cors = require('cors');
const pinoHttp = require('pino-http');
const timeout = require('connect-timeout');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const logger = require('./utils/logger');
const ipamRoutes = require('./routes/ipam/ipam');
const providers = require('./routes/ipam/providers');
const regions = require('./routes/ipam/regions');
const sites = require('./routes/ipam/sites');
const manufacturers = require('./routes/ipam/manufacturers');
const circuits = require('./routes/ipam/circuits');
const locations = require('./routes/ipam/locations');
const racks = require('./routes/ipam/racks');
const devices = require('./routes/ipam/devices');
const platforms = require('./routes/ipam/platforms');
const wireless = require('./routes/ipam/wireless');
const vrfs = require('./routes/ipam/vrfs');
const vlans = require('./routes/ipam/vlans');
const interfaces = require('./routes/ipam/interfaces');
const realtime = require('./realtime');
const commonModule = require('./routes/ipam/commonmoudule');
const vendors = require('./routes/assets/vendors');
const contracts = require('./routes/assets/contracts');
const purchaseOrders = require('./routes/assets/purchaseOrders');
const assets = require('./routes/assets/assets');
const activityLogs = require('./routes/activity_logs');
const dashboard = require('./routes/ipam/dashboard');
const assetsDashboard = require('./routes/assets/dashboard');

const { apiLimiter, writeLimiter, logLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const { pool } = require('./db');

const app = express();

const allowedOrigins = [
  'https://pagentz.web.app',
  'https://pagentz.firebaseapp.com',
  ...(process.env.NODE_ENV !== 'production'
    ? ['http://localhost:3000', 'http://localhost:5000', 'http://localhost:5173']
    : []),
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no Origin header (mobile apps, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Org-Id'],
  credentials: true,
}));

app.use(express.json());

// Abort requests that take longer than 30s (Flutter client timeout is 20s)
app.use(timeout('30s'));

// HTTP request logging — skip /health to avoid noise
// customProps runs at response time so orgId/userId are set by then (auth/org middleware ran)
app.use(pinoHttp({
  logger,
  genReqId: () => randomUUID(),
  autoLogging: { ignore: (req) => req.url === '/health' },
  customProps: (req) => ({
    orgId: req.orgid ?? undefined,
    userId: req.user?.user_id ?? undefined,
  }),
}));

// Halt timed-out requests before they reach rate limiters or route handlers
function haltOnTimedout(req, _res, next) {
  if (!req.timedout) next();
}
app.use(haltOnTimedout);

// Rate limiting — applied per module before route handlers
app.use('/api/ipam', apiLimiter);
app.use('/api/assets', apiLimiter);
app.use('/api/activity-logs', logLimiter);

// Stricter limits on write operations
app.post('/api/ipam/*', writeLimiter);
app.put('/api/ipam/*', writeLimiter);
app.delete('/api/ipam/*', writeLimiter);
app.post('/api/assets/*', writeLimiter);
app.put('/api/assets/*', writeLimiter);
app.delete('/api/assets/*', writeLimiter);

const port = process.env.PORT || 5000;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
realtime.setIo(io);

// API docs — served only in non-production to avoid exposing internals
if (process.env.NODE_ENV !== 'production') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));
}

// Health check — unauthenticated, no rate limit; used by Render for uptime monitoring
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({
      status: 'ok',
      uptime: process.uptime(),
      database: 'ok',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      uptime: process.uptime(),
      database: 'unreachable',
      timestamp: new Date().toISOString(),
    });
  }
});

// IPAM nested endpoints (prefixes/subnets/ips)
app.use('/api/ipam', ipamRoutes);
  app.use('/api/ipam/providers', providers);
  app.use('/api/ipam/regions', regions);
  app.use('/api/ipam/sites', sites);
  app.use('/api/ipam/manufacturers', manufacturers);
  app.use('/api/ipam/circuits', circuits);
  app.use('/api/ipam/locations', locations);
  app.use('/api/ipam/racks', racks);
  app.use('/api/ipam/devices', devices);
  app.use('/api/ipam/platforms', platforms);
  app.use('/api/ipam/wireless', wireless);
  app.use('/api/ipam/vrfs', vrfs);
  app.use('/api/ipam/vlans', vlans);
  app.use('/api/ipam/interfaces', interfaces);
  app.use('/api/ipam/common', commonModule);
  app.use('/api/ipam/dashboard', dashboard);
  // Assets Management
  app.use('/api/assets/dashboard', assetsDashboard);
  app.use('/api/assets/vendors', vendors);        // /api/assets/vendors (CRUD)
  app.use('/api/assets/contracts', contracts);    // /api/assets/contracts (CRUD)
  app.use('/api/assets/po', purchaseOrders);      // /api/assets/po (CRUD)
  app.use('/api/assets', assets);                 // /api/assets (POST create, GET list, GET/:id, PUT/:id, DELETE/:id)

  // Activity Logs
  app.use('/api/activity-logs', activityLogs);    // /api/activity-logs/query (filter & list)

app.use(errorHandler);

io.on('connection', (socket) => {
  const orgid = socket.handshake.query.orgid;
  logger.info({ socketId: socket.id }, 'ws client connected');

  if (orgid) {
    socket.join(`org_${orgid}`);
    logger.info({ socketId: socket.id, orgid }, 'ws client joined room');
  }

  socket.on('disconnect', () => logger.info({ socketId: socket.id }, 'ws client disconnected'));
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception — shutting down');
  process.exit(1);
});

if (require.main === module) {
  server.listen(port, () => logger.info({ port }, 'Server listening'));
}

module.exports = { app, server, io };
