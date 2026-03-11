/**
 * routes/prefetchRoutes.js
 * 
 * Routes for DICOM prefetch orchestration.
 */

'use strict';

const express = require('express');
const router = express.Router();
const prefetchController = require('../controllers/prefetchController');
const { verifyToken } = require('../middleware/authMiddleware');

/**
 * POST /api/prefetch/priors/:studyUID
 * Request background prefetching for a patient's previous studies.
 */
router.post('/priors/:studyUID', verifyToken, prefetchController.triggerPrefetch);

module.exports = router;
