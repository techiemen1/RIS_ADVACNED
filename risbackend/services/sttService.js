/**
 * sttService.js
 * Best Hybrid Offline (Vosk over WebSocket) + Cloud Whisper STT
 */

const WebSocket = require("ws");
const axios = require("axios");
const FormData = require("form-data");

const VOSK_WS = process.env.VOSK_WS || "ws://127.0.0.1:5001";
const WHISPER_KEY = process.env.GROQ_API_KEY || "";
const WHISPER_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

/* -------------------------------------------------------------
   1️⃣ OFFLINE ENGINE — VOSK (WebSocket)
------------------------------------------------------------- */
function recognizeWithVoskWS(buffer) {
  return new Promise((resolve) => {
    let textResult = "";
    const ws = new WebSocket(VOSK_WS);

    ws.on("open", () => {
      ws.send(buffer); // send raw PCM/WAV
      ws.send(JSON.stringify({ "eof": 1 })); // indicate end of file
    });

    ws.on("message", (msg) => {
      try {
        const json = JSON.parse(msg);
        if (json.text) {
          textResult = json.text;
        }
      } catch {
        // ignore non-json messages
      }
    });

    ws.on("close", () => resolve(textResult));
    ws.on("error", () => resolve("")); // fail silently → fallback to whisper
  });
}

/* -------------------------------------------------------------
   2️⃣ CLOUD ENGINE — WHISPER (GROQ)
------------------------------------------------------------- */
async function recognizeWithWhisper(buffer) {
  if (!WHISPER_KEY) {
    console.log("⚠ GROQ_API_KEY missing — skipping Whisper");
    return "";
  }

  try {
    const fd = new FormData();
    fd.append("file", buffer, "audio.wav");
    fd.append("model", "whisper-large-v3-turbo");
    fd.append("language", "en");

    const res = await axios.post(WHISPER_URL, fd, {
      headers: {
        Authorization: `Bearer ${WHISPER_KEY}`,
        ...fd.getHeaders(),
      },
      timeout: 15000,
    });

    return res.data?.text || "";
  } catch (err) {
    console.error("Whisper error:", err.message);
    return "";
  }
}

/* -------------------------------------------------------------
   3️⃣ MAIN HYBRID PIPELINE
------------------------------------------------------------- */
exports.processAudio = async (req) => {
  let audioBuffer = null;

  if (req.files?.audio) {
    audioBuffer = req.files.audio.data; // express-fileupload
  } else if (req.body?.audioBase64) {
    audioBuffer = Buffer.from(req.body.audioBase64, "base64");
  } else {
    throw new Error("❌ No audio received");
  }

  // 1 — Try Offline Vosk WebSocket
  const offlineText = await recognizeWithVoskWS(audioBuffer);
  if (offlineText) return offlineText;

  // 2 — Fallback to Whisper Cloud
  const cloudText = await recognizeWithWhisper(audioBuffer);
  return cloudText || "";
};
