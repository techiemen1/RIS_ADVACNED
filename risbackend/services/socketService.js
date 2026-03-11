/**
 * services/socketService.js
 *
 * WebSocket singleton — wraps socket.io so any module can emit events
 * without needing to pass the io instance around.
 *
 * Usage in server.js:
 *   const { initSocket } = require('./services/socketService');
 *   initSocket(httpsServer);
 *
 * Usage anywhere else:
 *   const { getIO } = require('./services/socketService');
 *   getIO().to('radiology').emit('STUDY_ARRIVED', payload);
 */

'use strict';

const { Server } = require('socket.io');

let _io = null;

/**
 * Initialize socket.io with the HTTPS server instance.
 * Must be called once in server.js after the HTTPS server is created.
 *
 * @param {https.Server} httpServer - The HTTPS server from server.js
 * @returns {Server}
 */
function initSocket(httpServer) {
  _io = new Server(httpServer, {
    cors: {
      origin: [
        'https://localhost:5173',
        'https://127.0.0.1:5173',
        /^https:\/\/192\.168\.\d{1,3}\.\d{1,3}:5173$/,
      ],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  _io.on('connection', (socket) => {
    console.log(`🔌 [WS] Client connected: ${socket.id}`);

    // --- STT Dictation Handlers ---
    const speechStream = require('./speechStreamService');
    
    socket.on('START_DICTATION', () => {
      speechStream.handleStart(socket, _io);
    });

    socket.on('STOP_DICTATION', () => {
      speechStream.handleStop(socket);
    });

    socket.on('AUDIO_CHUNK', (chunk) => {
      // chunk should be binary (Buffer/ArrayBuffer)
      speechStream.handleAudio(socket, chunk);
    });

    // Client joins a named room (e.g. 'radiology', 'reception')
    socket.on('join', (room) => {
      socket.join(room);
      console.log(`[WS] ${socket.id} joined room: ${room}`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 [WS] Client disconnected: ${socket.id} (${reason})`);
    });
  });

  console.log('📡 [WS] Socket.io initialized');
  return _io;
}

/**
 * Get the initialized io instance.
 * Safe to call if socket wasn't initialized — returns a no-op proxy.
 *
 * @returns {Server}
 */
function getIO() {
  if (!_io) {
    console.warn('[WS] socket.io not initialized — event not emitted');
    // Return a no-op proxy so callers don't need to null-check
    return {
      emit: () => {},
      to:   () => ({ emit: () => {} }),
    };
  }
  return _io;
}

module.exports = { initSocket, getIO };
