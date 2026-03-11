// routes/fhirRoutes.js
const express = require("express");
const router = express.Router();
const fhirController = require("../controllers/fhirController");
const { verifyToken } = require("../middleware/authMiddleware");

/**
 * FHIR R4 API Routes
 * Base path: /api/fhir
 */

// 1. Patient Resource
router.get("/Patient/:id", verifyToken, fhirController.getPatientResource);

// 2. DiagnosticReport Resource
router.get("/DiagnosticReport/:id", verifyToken, fhirController.getDiagnosticReportResource);

module.exports = router;
