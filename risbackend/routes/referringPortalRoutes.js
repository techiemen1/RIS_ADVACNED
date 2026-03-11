// routes/referringPortalRoutes.js
const express = require("express");
const router = express.Router();
const referringCtrl = require("../controllers/referringPortalController");
const { verifyToken, authorize } = require("../middleware/authMiddleware");

// All routes require authentication and referring_physician role
router.get("/studies", verifyToken, authorize(["referring_physician", "admin"]), referringCtrl.getReferralStudies);
router.get("/report/:studyUID", verifyToken, authorize(["referring_physician", "admin"]), referringCtrl.getReferralReport);

module.exports = router;
