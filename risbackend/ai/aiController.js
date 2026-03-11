// risbackend/ai/aiController.js
const aiService = require("./aiService");

const aiController = {
  analyzeStudy: async (req, res) => {
    const { studyId } = req.params;
    try {
      const result = await aiService.analyzeStudy(studyId);
      res.json({ ok: true, result });
    } catch (err) {
      res.status(500).json({ ok: false, message: err.message });
    }
  },

  autoReport: async (req, res) => {
    const { patientId, studyId } = req.body;
    try {
      const report = await aiService.autoReport(patientId, studyId);
      res.json({ ok: true, report });
    } catch (err) {
      res.status(500).json({ ok: false, message: err.message });
    }
  },

  translateReport: async (req, res) => {
    const { text, language } = req.body;
    try {
      const translatedSelection = await aiService.translateText(text, language);
      res.json({ success: true, translatedText: translatedSelection });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  simplifyReport: async (req, res) => {
    const { text } = req.body;
    try {
      const summary = await aiService.generateSummary(text);
      res.json({ success: true, summary: summary });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
};

module.exports = aiController;
