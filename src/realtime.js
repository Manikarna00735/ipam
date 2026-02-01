let io = null;

function setIo(server) {
  io = server;
}

// function emit(event, payload) {
//   if (!io) return;
//   io.emit(event, payload);
// }

/**
 * @param {string} room - The Organization ID or Subnet ID
 * @param {string} event - The event name (e.g., 'IP_UPDATED')
 * @param {object} payload - The data to send
 */
function emit(room, event, payload) {
  if (!io) return;
  // Use .to(room) to ensure only users in that org get the data
  io.to(room).emit(event, payload);
}

module.exports = { setIo, emit };
