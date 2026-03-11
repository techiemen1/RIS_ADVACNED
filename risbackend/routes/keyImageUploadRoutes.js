const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");
const ctrl = require("../controllers/keyImageUploadController");

router.post(
  "/reports/key-images/upload",
  auth,
  upload.single("file"),
  ctrl.upload
);

module.exports = router;

