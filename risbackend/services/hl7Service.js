// services/hl7Service.js
const net = require("net");

/**
 * MLLP Constants
 * Minimal Lower Layer Protocol (MLLP) wrapping
 */
const VT = String.fromCharCode(0x0b); // Vertical Tab (Start)
const FS = String.fromCharCode(0x1c); // File Separator (End)
const CR = String.fromCharCode(0x0d); // Carriage Return (Segment End)

/**
 * Escapes HL7 special characters in a string
 */
const escapeHL7 = (str) => {
  if (!str) return "";
  return str
    .replace(/\\/g, "\\E\\")
    .replace(/\|/g, "\\F\\")
    .replace(/\^/g, "\\S\\")
    .replace(/&/g, "\\T\\")
    .replace(/~/g, "\\R\\")
    .replace(/\r?\n/g, "\\.br\\");
};

/**
 * Sends an ORU^R01 (Observation Result) message to EMR
 */
exports.sendORU = async ({ patient, report }) => {
  if (!patient || !report) throw new Error("Missing patient or report data");

  const now = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const msgId = `${Date.now()}`;

  // 1. Construct HL7 Segments
  const MSH = `MSH|^~\\&|iPacxRIS|HOSPITAL|EMR|EMR_SYSTEM|${now}||ORU^R01|${msgId}|P|2.3`;
  const PID = `PID|||${patient.patient_id || ""}||${escapeHL7(patient.patient_name)}||${patient.patient_dob || ""}|${patient.patient_sex || ""}`;
  const OBR = `OBR|1||${patient.accession_number || ""}|||${now}|||||||||||${escapeHL7(report.radiologist)}`;
  const OBX = `OBX|1|TX|REPORT^Radiology Report||${escapeHL7(report.content)}|||N|||F`;

  // 2. Wrap in MLLP
  const hl7Message = [MSH, PID, OBR, OBX].join(CR) + CR;
  const mllpMessage = VT + hl7Message + FS + CR;

  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    const host = process.env.HL7_HOST || "127.0.0.1";
    const port = parseInt(process.env.HL7_PORT) || 2575;

    console.log(`📡 [HL7] Sending MLLP to ${host}:${port}...`);

    client.setTimeout(5000);

    client.connect(port, host, () => {
      client.write(mllpMessage);
      console.log(`✅ [HL7] Message sent (ID: ${msgId})`);
      client.end();
      resolve(true);
    });

    client.on("error", (err) => {
      console.error(`❌ [HL7] Connection error: ${err.message}`);
      reject(err);
    });

    client.on("timeout", () => {
      console.warn("⚠️ [HL7] Connection timeout");
      client.destroy();
      reject(new Error("HL7 Timeout"));
    });
  });
};


