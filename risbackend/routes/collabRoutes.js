// routes/collabRoutes.js
const express = require('express');
const router = express.Router();
const collabController = require('../controllers/collabController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/session', verifyToken, collabController.createSession);
router.get('/session/:sessionId', verifyToken, collabController.getSession);
router.put('/session/:sessionId', verifyToken, collabController.updateSession);

module.exports = router;
