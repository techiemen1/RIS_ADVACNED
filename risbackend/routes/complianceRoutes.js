// routes/complianceRoutes.js
const express = require("express");
const router = express.Router();
const complianceController = require("../controllers/complianceController");

// Generate Form F PDF
router.post("/form-f/generate", complianceController.generateFormF);

// Check if Form F exists for a patient
router.get("/form-f/status/:patientId", complianceController.checkFormFStatus);

// Delete Form F (Admin/Dev)
router.delete("/form-f/:patientId", complianceController.deleteFormF);

module.exports = router;
