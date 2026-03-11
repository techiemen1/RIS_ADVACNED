const express = require('express');
const router = express.Router();
const { cleanupData } = require('../controllers/adminController');
const { verifyToken, authorize } = require('../middleware/authMiddleware');

// Only ‘admin’ can access these
router.post('/cleanup', verifyToken, authorize(['admin']), cleanupData);

module.exports = router;
