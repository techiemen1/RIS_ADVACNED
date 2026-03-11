const Groq = require("groq-sdk");
const openai = require("openai");

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

const aiService = {
  /**
   * Translates clinical text into regional Indian languages
   */
  async translateText(text, targetLanguage) {
    if (!text) return "";

    // Choose Groq as primary for speed/cost, fallback to OpenAI if needed
    if (groq) {
      try {
        const completion = await groq.chat.completions.create({
          messages: [
            { role: "system", content: `You are a medical translator. Translate the following clinical findings into ${targetLanguage}. Maintain the medical accuracy but make it readable for a patient.` },
            { role: "user", content: text }
          ],
          model: "llama-3.3-70b-versatile",
        });
        return completion.choices[0]?.message?.content || text;
      } catch (err) {
        console.error("Groq Translation Error:", err.message);
      }
    }

    // Final fallback: return original text if AI fails
    return text;
  },

  /**
   * Generates a simplified, layman-friendly summary of medical findings
   */
  async generateSummary(text) {
    if (!text) return "";

    if (groq) {
      try {
        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: `You are a patient advocate and medical educator. 
              Rewrite the following technical radiology findings into a simple, reassuring, 
              and easy-to-understand summary for a non-medical person. 
              Avoid jargon, use bullet points if helpful, and keep it under 100 words.`
            },
            { role: "user", content: text }
          ],
          model: "llama-3.3-70b-versatile",
        });
        return completion.choices[0]?.message?.content || "No summary available.";
      } catch (err) {
        console.error("Groq Summary Error:", err.message);
      }
    }
    return "AI Summary is currently unavailable.";
  },

  async analyzeStudy(studyId) {
    // ... existing mock ...
    return {
      studyId,
      findings: [
        { description: "No acute abnormality detected", confidence: 0.95 },
        { description: "Minor calcification noted", confidence: 0.78 },
      ],
      recommendedReport: "Patient appears normal. Mild calcification observed in left lung.",
    };
  },

  async autoReport(patientId, studyId) {
    return {
      patientId,
      studyId,
      report: `AI-generated preliminary report for patient ${patientId}, study ${studyId}.`,
      timestamp: new Date(),
    };
  },
};

module.exports = aiService;
