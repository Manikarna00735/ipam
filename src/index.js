require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const { createRoutes } = require('./routes/resources');
const ipamRoutes = require('./routes/ipam');
const providers = require('./routes/providers');
const regions = require('./routes/regions');
const sites = require('./routes/sites');
const manufacturers = require('./routes/manufacturers');
const circuits = require('./routes/circuits');
const locations = require('./routes/locations');
const racks = require('./routes/racks');
const devices = require('./routes/devices');
const platforms = require('./routes/platforms');
const wireless = require('./routes/wireless');
const vrfs = require('./routes/vrfs');
const vlans = require('./routes/vlans');
const interfaces = require('./routes/interfaces');
const realtime = require('./realtime');

const app = express();
app.use(express.json());

const port = process.env.PORT || 5000;
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
realtime.setIo(io);

// app.use('/api/auth', authRoutes);
// app.use('/api', userRoutes);

// Mount generic resource routes
// app.use('/api/ipam/providers', createRoutes('providers', { requiredFields: ['name', 'slug'], slugUnique: true }));
// app.use('/api/ipam/sites', createRoutes('sites', { requiredFields: ['name', 'slug', 'status'], slugUnique: true }));
// app.use('/api/ipam/regions', createRoutes('regions', { requiredFields: ['name', 'slug'], slugUnique: true }));
// app.use('/api/ipam/locations', createRoutes('locations', { requiredFields: ['name', 'slug', 'status', 'site'] }));
// app.use('/api/ipam/racks', createRoutes('racks', { requiredFields: ['name', 'slug', 'status', 'site'], slugUnique: true }));
// app.use('/api/ipam/manufacturers', createRoutes('manufacturers', { requiredFields: ['name', 'slug'], slugUnique: true }));
// app.use('/api/ipam/platforms', createRoutes('platforms', { requiredFields: ['name', 'slug'], slugUnique: true }));
// app.use('/api/ipam/vrfs', createRoutes('vrfs', { requiredFields: ['vfsId', 'name'] }));
// app.use('/api/ipam/vlans', createRoutes('vlans', { requiredFields: ['vId', 'name', 'status'] }));
// app.use('/api/ipam/circuits', createRoutes('circuits', { requiredFields: ['circuitId', 'provider', 'type', 'status', 'sideA'] }));
// app.use('/api/ipam/devices', createRoutes('devices', { requiredFields: ['name', 'deviceRole', 'deviceType', 'site'] }));
// app.use('/api/ipam/interfaces', createRoutes('interfaces', { requiredFields: ['device', 'name', 'type'] }));
// app.use('/api/ipam/wireless', createRoutes('wireless', { requiredFields: ['ssId', 'status'] }));

// IPAM nested endpoints (prefixes/subnets/ips)
// app.use('/api/ipam', ipamRoutes);
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

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal error' });
});


io.on('connection', (socket) => {
  console.log('ws client connected', socket.id);
  socket.on('disconnect', () => console.log('ws client disconnected', socket.id));
});

if (require.main === module) {
  server.listen(port, () => console.log(`Server listening on port ${port}`));
}

module.exports = { app, server, io };
require('dotenv').config();
