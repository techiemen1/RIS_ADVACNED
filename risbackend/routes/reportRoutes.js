const express = require("express");
const router = express.Router();

const reportController = require("../controllers/reportController");
const auth = require("../middleware/auth");
const audit = require("../middleware/auditLogger");
const upload = require("../middleware/upload");
const keyImageCtrl = require("../controllers/keyImageController");

/* =========================
   READ
========================= */

// Get latest report for study
router.get(
  "/:studyUID",
  auth,
  reportController.getReport
);

// Get report status (worklist / PACS)
router.get(
  "/status/:studyUID",
  auth,
  reportController.getReportStatus
);

// List reports (admin / reports page)
router.get(
  "/",
  auth,
  reportController.listReports
);

// Get addenda
router.get(
  "/:studyUID/addenda",
  auth,
  reportController.getAddenda
);

/* =========================
   WRITE
========================= */

// Save or update report (draft)
router.post(
  "/save",
  auth,
  audit("SAVE", "REPORT"),
  reportController.saveReportUpsert
);

// Finalize report
router.post(
  "/finalize",
  auth,
  audit("FINALIZE", "REPORT"),
  reportController.finalizeReport
);

// Add addendum
router.post(
  "/addendum",
  auth,
  audit("ADD_ADDENDUM", "REPORT"),
  reportController.addAddendum
);

/* ===== KEY IMAGES ===== */

// List
router.get(
  "/:studyUID/keyimages",
  auth,
  keyImageCtrl.list
);

// Add DICOM (OHIF)
router.post(
  "/:studyUID/keyimage/dicom",
  auth,
  keyImageCtrl.addDicom
);

// Upload screenshot/image
router.post(
  "/:studyUID/keyimage/upload",
  auth,
  upload.single("image"),
  keyImageCtrl.uploadFile
);

// Delete Key Image
router.delete(
  "/keyimage/:id",
  auth,
  keyImageCtrl.remove
);

const { verifyToken, authorize } = require("../middleware/authMiddleware");

// Delete Report (Admin Only - Medical Legal Requirement)
router.delete(
  "/study/:studyUID",
  verifyToken,
  authorize(["admin"]),
  audit("DELETE", "REPORT"),
  reportController.deleteReport
);

module.exports = router;
