const express = require('express');
const router = express.Router();
const { getWorklist, syncPacsStudies } = require('../controllers/worklistController');
const { verifyToken, authorize } = require('../middleware/authMiddleware');

// ✅ Get worklist (all or assigned)
router.get('/', verifyToken, getWorklist);

// ✅ Sync PACS studies to worklist (admin or radiologist)
router.post('/sync', verifyToken, authorize(['admin','radiologist']), syncPacsStudies);

module.exports = router;
