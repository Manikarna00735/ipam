let io = null;

function setIo(server) {
  io = server;
}

function emit(event, payload) {
  if (!io) return;
  io.emit(event, payload);
}

module.exports = { setIo, emit };
