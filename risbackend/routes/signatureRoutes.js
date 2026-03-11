// routes/signatureRoutes.js
const express = require("express");
const router = express.Router();
const signatureController = require("../controllers/signatureController");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `signature_${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage });

router.get("/:userId", signatureController.getSignature);
router.post("/upload", upload.single("signature"), signatureController.uploadSignature);

module.exports = router;
