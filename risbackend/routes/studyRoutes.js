// routes/studyRoutes.js
// Rev 2: Added /arrived webhook endpoint (no JWT — Orthanc can't send tokens)
//        Added /arrivals list endpoint for worklist dashboard.

const express = require("express");
const router  = express.Router();

const auth = require("../middleware/auth");
const { verifyToken } = require("../middleware/authMiddleware");
const { requireBranchContext } = require("../middleware/branchMiddleware");
const ctrl = require("../controllers/studyController");

/* ──────────────────────────────────────────────────────────
   ORTHANC WEBHOOK — no JWT
   POST /api/studies/arrived
   ──────────────────────────────────────────────────────────
   Called internally by Orthanc (StableStudy event).
   NOT exposed to the public internet — nginx should restrict
   this path to localhost / PACS subnet only.

   Orthanc webhook plugin config (/etc/orthanc/orthanc.json):
     "WebhooksOnChange": {
       "http://localhost:5000/api/studies/arrived": ["StableStudy"]
     }
   ────────────────────────────────────────────────────────── */
router.post("/arrived", ctrl.studyArrived);

/* ──────────────────────────────────────────────────────────
   WORKLIST DASHBOARD — JWT protected
   GET /api/studies/arrivals
   ────────────────────────────────────────────────────────── */
router.get("/arrivals", verifyToken, requireBranchContext, ctrl.listArrivals);

/* ──────────────────────────────────────────────────────────
   EXISTING PROTECTED ROUTES (unchanged)
   ────────────────────────────────────────────────────────── */
router.get("/",                        auth, ctrl.getAllStudies);
router.get("/:studyUID/meta",          auth, ctrl.getStudyMeta);
router.get("/:studyUID/dicom-tags",    auth, ctrl.getDicomTags);
router.get("/patient/:patientID/priors", auth, ctrl.getPatientPriors);
router.post("/:studyUID/meta",         auth, ctrl.updateStudyMeta);

module.exports = router;
