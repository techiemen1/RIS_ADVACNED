/**
 * services/speechStreamService.js
 * 
 * Orchestrates real-time speech-to-text streaming session lifecycle.
 * Proxies audio chunks to a speech recognition engine (Vosk/Whisper).
 */

'use strict';

const WebSocket = require('ws');

// VOSK WebSocket endpoint for streaming (must be running on 5001)
const VOSK_WS_URL = process.env.VOSK_WS || "ws://127.0.0.1:5001";

class SpeechSession {
    constructor(socketId, io) {
        this.socketId = socketId;
        this.io = io;
        this.voskWS = null;
        this.isActive = false;
        this.buffer = [];
    }

    /**
     * Start the dictation session by connecting to the STT engine.
     */
    async start() {
        if (this.isActive) return;

        try {
            console.log(`🎙️ [Speech] Opening STT stream for socket: ${this.socketId}`);
            this.voskWS = new WebSocket(VOSK_WS_URL);

            this.voskWS.on('open', () => {
                this.isActive = true;
                this.io.to(this.socketId).emit('DICTATION_STARTED', { success: true });
            });

            this.voskWS.on('message', (data) => {
                try {
                    const result = JSON.parse(data);
                    // Vosk returns 'result' (final) or 'partial' (real-time)
                    if (result.partial || result.text) {
                        this.io.to(this.socketId).emit('DICTATION_RESULT', {
                            text: result.text || result.partial,
                            isFinal: !!result.text
                        });
                    }
                } catch (e) {
                    // Ignore parsing errors
                }
            });

            this.voskWS.on('error', (err) => {
                console.error(`❌ [Speech] STT Engine Error:`, err.message);
                this.stop();
            });

            this.voskWS.on('close', () => {
                this.isActive = false;
                this.io.to(this.socketId).emit('DICTATION_STOPPED');
            });

        } catch (err) {
            console.error(`💥 [Speech] Failed to initialize session:`, err.message);
            this.io.to(this.socketId).emit('DICTATION_ERROR', { message: "STT Engine unreachable" });
        }
    }

    /**
     * Process a binary audio chunk.
     */
    handleAudio(chunk) {
        if (!this.isActive || !this.voskWS || this.voskWS.readyState !== WebSocket.OPEN) {
            return;
        }
        // Send raw binary to Vosk
        this.voskWS.send(chunk);
    }

    /**
     * Stop and cleanup the session.
     */
    stop() {
        if (this.voskWS) {
            // Tell Vosk we are done
            if (this.voskWS.readyState === WebSocket.OPEN) {
                this.voskWS.send(JSON.stringify({ "eof": 1 }));
            }
            this.voskWS.close();
        }
        this.isActive = false;
        this.voskWS = null;
    }
}

// Session Registry
const sessions = new Map();

/**
 * Handle dictation start trigger from Socket.io
 */
function handleStart(socket, io) {
    let session = sessions.get(socket.id);
    if (!session) {
        session = new SpeechSession(socket.id, io);
        sessions.set(socket.id, session);
    }
    session.start();
}

/**
 * Handle incoming binary audio chunk
 */
function handleAudio(socket, chunk) {
    const session = sessions.get(socket.id);
    if (session) {
        session.handleAudio(chunk);
    }
}

/**
 * Stop session on request or disconnect
 */
function handleStop(socket) {
    const session = sessions.get(socket.id);
    if (session) {
        session.stop();
        sessions.delete(socket.id);
        console.log(`🎙️ [Speech] Session closed for ${socket.id}`);
    }
}

module.exports = {
    handleStart,
    handleAudio,
    handleStop
};
