const express = require('express');
const router = express.Router();
const { getSystemConfig, updateSystemConfig } = require('../controllers/configController');
const { verifyToken } = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

router.get('/', verifyToken, adminMiddleware, getSystemConfig);
router.put('/', verifyToken, adminMiddleware, updateSystemConfig);

module.exports = router;
