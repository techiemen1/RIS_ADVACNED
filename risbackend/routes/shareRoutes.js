const express = require('express');
const router = express.Router();
const shareController = require('../controllers/shareController');
const fileUpload = require('express-fileupload');

// Route specific file upload middleware
const uploadMiddleware = fileUpload({
    createParentPath: true,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

router.post('/patient-report', uploadMiddleware, shareController.shareReport);
router.get('/public/:filename', shareController.getPublicReport);

module.exports = router;
