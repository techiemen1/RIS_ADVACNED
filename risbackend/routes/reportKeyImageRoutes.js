// routes/reportKeyImageRoutes.js

const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const upload = require("../middleware/upload");
const ctrl = require("../controllers/keyImageController");

console.log("KEY IMAGE CTRL:", Object.keys(ctrl));


/* =========================
   LIST KEY IMAGES
========================= */
router.get(
  "/reports/:studyUID/keyimages",
  auth,
  ctrl.list
);

/* =========================
   ADD DICOM KEY IMAGE
   (OHIF / Weasis)
========================= */
router.post(
  "/reports/:studyUID/keyimage/dicom",
  auth,
  ctrl.addDicom
);

/* =========================
   UPLOAD IMAGE FILE
   (Screenshot / fallback)
========================= */
router.post(
  "/reports/:studyUID/keyimage/upload",
  auth,
  upload.single("image"),
  ctrl.uploadFile
);

/* =========================
   DELETE
========================= */
router.delete(
  "/reports/keyimage/:id",
  auth,
  ctrl.remove
);

module.exports = router;

