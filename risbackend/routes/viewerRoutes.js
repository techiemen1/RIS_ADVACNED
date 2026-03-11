/**
 * routes/viewerRoutes.js
 * 
 * Routes for DICOM viewer orchestration.
 */

'use strict';

const express = require('express');
const router = express.Router();
const viewerController = require('../controllers/viewerController');
const { verifyToken } = require('../middleware/authMiddleware');

/**
 * GET /api/viewer/launch/:studyUID
 * Returns the launch URL or JSON config for the requested viewer.
 */
router.get('/launch/:studyUID', verifyToken, viewerController.launchStudy);

module.exports = router;
