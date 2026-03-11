const express = require('express');
const router = express.Router();
const mwlController = require('../controllers/mwlController');
// MWL typically public or basic auth for machines, but we'll use API key or loose auth for now or same middleware.
// Verification: If Modality is querying, it might not have JWT.
// For now, let's keep it open or assume internal network, or use a specific middleware. 
const { authorize } = require('../middleware/authMiddleware');

router.get('/', mwlController.getWorklist); // Allow Modalities to query

module.exports = router;
