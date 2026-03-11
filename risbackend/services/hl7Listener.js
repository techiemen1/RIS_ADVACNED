// services/hl7Listener.js
const net = require("net");

/**
 * MLLP Constants
 */
const VT = 0x0b; // Vertical Tab (Start)
const FS = 0x1c; // File Separator (End)
const CR = 0x0d; // Carriage Return

/**
 * HL7 Listener Service
 * Listens for inbound MLLP-wrapped HL7 messages (ADT, ORM)
 */
class HL7Listener {
    constructor(port = 2576) {
        this.port = port;
        this.server = null;
    }

    start() {
        this.server = net.createServer((socket) => {
            let buffer = Buffer.alloc(0);

            socket.on("data", (data) => {
                buffer = Buffer.concat([buffer, data]);

                // Check for MLLP start and end
                if (buffer[0] === VT && buffer[buffer.length - 2] === FS && buffer[buffer.length - 1] === CR) {
                    const rawMessage = buffer.slice(1, buffer.length - 2).toString();
                    this.handleMessage(rawMessage, socket);
                    buffer = Buffer.alloc(0); // Reset buffer
                }
            });

            socket.on("error", (err) => {
                console.error("❌ [HL7 Listener] Socket error:", err.message);
            });
        });

        this.server.listen(this.port, "0.0.0.0", () => {
            console.log(`📡 [HL7 Listener] Listening for MLLP on port ${this.port}`);
        });
    }

    handleMessage(msg, socket) {
        const segments = msg.split(/\r?\n|\r/);
        const msh = segments[0];

        if (!msh.startsWith("MSH")) {
            console.warn("⚠️ [HL7 Listener] Invalid message: Missing MSH segment");
            return;
        }

        const fields = msh.split("|");
        const msgType = fields[8]; // e.g., ORM^O01 or ADT^A01

        console.log(`📥 [HL7 Listener] Received ${msgType} message`);

        // --- Logic for ADT/ORM handling will go here ---
        // 1. Parse PID/OBR segments
        // 2. Map to Database (Patients/Worklist)
        // 3. Send ACK back to HIS

        this.sendACK(fields, socket);
    }

    sendACK(mshFields, socket) {
        const now = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
        const msgId = `ACK_${Date.now()}`;
        const originalMsgId = mshFields[9];

        const ack = [
            `MSH|^~\\&|iPacxRIS|HOSPITAL|EMR|EMR_SYSTEM|${now}||ACK|${msgId}|P|2.3`,
            `MSA|AA|${originalMsgId}`,
        ].join(String.fromCharCode(CR)) + String.fromCharCode(CR);

        const mllpAck = String.fromCharCode(VT) + ack + String.fromCharCode(FS) + String.fromCharCode(CR);
        socket.write(mllpAck);
        console.log(`✅ [HL7 Listener] Sent ACK for ${originalMsgId}`);
    }
}

module.exports = new HL7Listener(process.env.HL7_LISTEN_PORT || 2576);
