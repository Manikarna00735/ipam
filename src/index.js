require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
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
const commonModule = require('./routes/commonmoudule');
const vendors = require('./routes/assets/vendors');
const contracts = require('./routes/assets/contracts');
const purchaseOrders = require('./routes/assets/purchaseOrders');

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 5000;
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
realtime.setIo(io);


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
  app.use('/api/assets/vendors', vendors);
  app.use('/api/assets/contracts', contracts);
  app.use('/api/assets/po', purchaseOrders);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal error' });
});


io.on('connection', (socket) => {
  const orgid = socket.handshake.query.orgid;
  console.log('ws client connected', socket.id);

  if (orgid) {
    // 2. The socket "joins" a specific channel
    socket.join(`org_${orgid}`);
    console.log(`Client ${socket.id} joined room: org_${orgid}`);
  }

  socket.on('disconnect', () => console.log('ws client disconnected', socket.id));
});

if (require.main === module) {
  server.listen(port, () => console.log(`Server listening on port ${port}`));
}

module.exports = { app, server, io };
require('dotenv').config();
