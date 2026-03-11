const express = require('express');
const router = express.Router();
const dicomExportController = require('../controllers/dicomExportController');
const fileUpload = require('express-fileupload');

// Route specific file upload middleware to avoid conflicts
// Only apply fileUpload to this route to be safe if not global
const uploadMiddleware = fileUpload({
    createParentPath: true,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

router.post('/export-pdf', uploadMiddleware, dicomExportController.exportReportToPacs);

module.exports = router;
