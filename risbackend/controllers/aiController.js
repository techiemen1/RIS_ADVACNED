const { generateText, transcribeAudio } = require("../services/aiService");
const fs = require("fs");

/**
 * POST /api/ai/generate
 * ... (existing doc)
 */
exports.generate = async (req, res) => {
  // ... existing code ...
  try {
    const { context, type } = req.body || {};
    const result = await generateText({ context, type });

    if (!result || !result.ok) {
      return res.status(500).json({
        success: false,
        message: "AI generation failed",
      });
    }

    return res.json({
      success: true,
      data: result.text,
      source: result.source,
    });
  } catch (err) {
    console.error("aiController.generate", err);
    return res.status(500).json({
      success: false,
      message: err?.message || "AI error",
    });
  }
};

/**
 * POST /api/ai/transcribe
 * Multipart: { audio: blob }
 */
exports.transcribe = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No audio file provided" });
    }

    const { transcribeAudio } = require("../services/aiService");
    const result = await transcribeAudio(req.file.path);

    // cleanup temp file
    fs.unlink(req.file.path, (err) => {
      if (err) console.error("Temp audio delete fail:", err);
    });

    if (!result || !result.ok) {
      return res.status(500).json({ success: false, message: result?.message || "Transcription failed" });
    }

    return res.json({
      success: true,
      text: result.text
    });
  } catch (err) {
    console.error("aiController.transcribe", err);
    return res.status(500).json({ success: false, message: "Server error during transcription" });
  }
};

/**
 * GET /api/ai/study-context/:studyUID
 */
exports.getStudyContext = async (req, res) => {
  try {
    const { studyUID } = req.params;
    if (!studyUID) {
      return res.status(400).json({ success: false, message: "Missing studyUID" });
    }

    const { pool } = require("../config/postgres");
    
    // First, try to fetch from cache
    const existing = await pool.query(
      "SELECT * FROM ai_clinical_context WHERE study_instance_uid = $1",
      [studyUID]
    );

    if (existing.rows.length > 0) {
      return res.json({ success: true, data: existing.rows[0] });
    }

    // Otherwise, generate it on the fly
    const { generateContext } = require("../services/aiClinicalContextService");
    const newContext = await generateContext(studyUID);

    return res.json({ success: true, data: newContext });
  } catch (err) {
    console.error("aiController.getStudyContext", err);
    return res.status(500).json({ success: false, message: err?.message || "AI Context generation failed" });
  }
};
