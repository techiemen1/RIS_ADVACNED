// risbackend/ai/aiRoutes.js
const express = require("express");
const router = express.Router();
const aiController = require("./aiController");
const webhookController = require("./webhookController");

// Analyze a DICOM study
router.get("/analyze/:studyId", aiController.analyzeStudy);

// Generate auto-report
router.post("/report", aiController.autoReport);

// Multi-lingual Translation
router.post("/translate", aiController.translateReport);

// Layman Summary
router.post("/summarize", aiController.simplifyReport);

// External AI Webhook (Ingest findings)
router.post("/webhook/findings", webhookController.ingestAIFindings);

module.exports = router;
