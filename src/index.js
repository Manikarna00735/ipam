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
