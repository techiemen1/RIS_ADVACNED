// routes/patientPortalRoutes.js
const express = require("express");
const router = express.Router();
const patientPortalController = require("../controllers/patientPortalController");
const { verifyToken, authorize } = require("../middleware/authMiddleware");

// 1. Staff: Generate link for a report (Requires authentication)
router.post("/generate-link", verifyToken, patientPortalController.generateAccessLink);

// 3. Staff: Share link via channel (Requires authentication)
router.post("/share", verifyToken, patientPortalController.shareAccess);

// 2. Patient: Retrieve report (No auth header needed, uses token & OTP)
router.get("/view/:token", patientPortalController.getReportByToken);

module.exports = router;
