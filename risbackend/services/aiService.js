// services/aiService.js
/**
 * aiService.js
 * Groq + local fallback for radiology reporting
 */

const Groq = require("groq-sdk");

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const DEFAULT_MODEL = process.env.GROQ_MODEL || "llama3-70b-8192";

/**
 * Very simple local radiology generator so that
 * the app still works even if no AI key or Groq fails.
 */
function localRadiologyGenerator(rawContext = "", type = "impression") {
  const context = String(rawContext || "").toLowerCase();

  if (!context.trim()) {
    if (type === "impression") {
      return "No significant abnormality is detected. Please correlate clinically.";
    }
    return "Clinical details and imaging findings are not available. Please provide more information for detailed reporting.";
  }

  // Heuristic examples
  if (context.includes("normal") || context.includes("no abnormality")) {
    if (type === "impression") {
      return "No acute abnormality identified. Appearances are within normal limits for the patient's age.";
    }
    return "Imaging shows no significant abnormality. Organs appear normal in size, shape and attenuation/signal.";
  }

  if (context.includes("fracture")) {
    if (type === "impression") {
      return "Imaging features are in keeping with a fracture. Please correlate with clinical findings and consider orthopedic review.";
    }
    return "There is cortical discontinuity and malalignment suggesting a fracture, with adjacent soft tissue swelling.";
  }

  if (context.includes("pneumonia") || context.includes("consolidation")) {
    if (type === "impression") {
      return "Findings are suggestive of infective consolidation. Recommend clinical correlation and follow-up imaging as required.";
    }
    return "Patchy / segmental areas of consolidation are noted, consistent with pneumonia in the appropriate clinical setting.";
  }

  // Generic fallback
  if (type === "impression") {
    return "Imaging findings are abnormal. Recommend correlation with clinical history and further evaluation as appropriate.";
  }

  return "Imaging demonstrates changes that may be clinically significant. Detailed description is provided above.";
}

/**
 * Create Groq client lazily, ONLY if we have an API key.
 * This avoids crashing when GROQ_API_KEY is not set.
 */
function getGroqClient() {
  if (!GROQ_API_KEY) return null;
  return new Groq({ apiKey: GROQ_API_KEY });
}

/**
 * Main AI text generator
 * @param {object} opts
 * @param {string} opts.context  - free text context (e.g., findings / notes)
 * @param {string} [opts.type]   - "findings" | "impression"
 */
async function generateText({ context, type = "impression" } = {}) {
  const cleanContext = String(context || "").slice(0, 8000);
  const sectionType = type === "findings" ? "findings" : "impression";

  // If no key -> pure local, never crash
  const groq = getGroqClient();
  if (!groq) {
    const text = localRadiologyGenerator(cleanContext, sectionType);
    return {
      ok: true,
      source: "local-no-key",
      text,
    };
  }

  // Try Groq, fall back to local if anything fails
  try {
    const completion = await groq.chat.completions.create({
      model: DEFAULT_MODEL,
      temperature: 0.2,
      max_tokens: 512,
      messages: [
        {
          role: "system",
          content:
            "You are a concise radiology reporting assistant. " +
            "Generate structured, professional text in ENGLISH, suitable for direct insertion into a radiology report. " +
            "Do not add disclaimers, just the clinical content.",
        },
        {
          role: "user",
          content:
            `Context (radiology notes / findings / history):\n` +
            `${cleanContext}\n\n` +
            `Task: Generate a short, clear ${sectionType.toUpperCase()} section. ` +
            `Use full sentences, no bullet points unless clearly appropriate.`,
        },
      ],
    });

    const aiText =
      completion?.choices?.[0]?.message?.content?.trim() || "";

    if (aiText) {
      return {
        ok: true,
        source: "groq",
        text: aiText,
      };
    }

    // Empty result -> fallback
    const fallback = localRadiologyGenerator(cleanContext, sectionType);
    return {
      ok: true,
      source: "local-empty",
      text: fallback,
    };
  } catch (err) {
    console.error("aiService.generateText Groq error:", err);
    const fallback = localRadiologyGenerator(cleanContext, sectionType);
    return {
      ok: true,
      source: "local-error",
      text: fallback,
    };
  }
}

const OpenAI = require("openai");
const fs = require("fs");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

/**
 * Initialize OpenAI client
 */
function getOpenAIClient() {
  if (!OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: OPENAI_API_KEY });
}

/**
 * Transcribe audio using Whisper
 * @param {string} filePath - Path to local audio file
 */
async function transcribeAudio(filePath) {
  const openai = getOpenAIClient();
  if (!openai) {
    return { ok: false, message: "OpenAI API key not configured" };
  }

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-1",
      language: "en",
    });

    return {
      ok: true,
      text: transcription.text,
    };
  } catch (err) {
    console.error("aiService.transcribeAudio error:", err);
    return { ok: false, message: err?.message || "Transcription failed" };
  }
}

module.exports = {
  generateText,
  localRadiologyGenerator,
  transcribeAudio
};
