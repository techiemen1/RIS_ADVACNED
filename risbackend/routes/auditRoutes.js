// routes/auditRoutes.js
const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('../controllers/auditController');
const { verifyToken, authorize } = require('../middleware/authMiddleware');

// Only admin and radiologist roles can view audit logs
router.get('/', verifyToken, authorize(['admin', 'radiologist']), getAuditLogs);

module.exports = router;
