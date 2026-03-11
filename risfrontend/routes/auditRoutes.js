// routes/auditRoutes.js
const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/authMiddleware');
const { getAuditLogs } = require('../controllers/auditController');

/**
 * @route   GET /api/audit/logs
 * @desc    Fetch recent audit logs
 * @access  Admins only
 */
router.get('/logs', verifyToken, authorize(['admin', 'superadmin']), getAuditLogs);

module.exports = router;
