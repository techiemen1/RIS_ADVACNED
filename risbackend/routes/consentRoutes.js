const express = require('express');
const router = express.Router();
const consentController = require('../controllers/consentController');
const { verifyToken, authorize } = require('../middleware/authMiddleware');

// Get all consents for a patient
router.get('/:patientId', verifyToken, consentController.getConsents);

// Add a new consent
router.post('/', verifyToken, consentController.addConsent);

// Revoke a consent
router.put('/:id/revoke', verifyToken, authorize(['admin', 'radiologist']), consentController.revokeConsent);

// Delete a consent (Admin only)
router.delete('/:id', verifyToken, authorize(['admin']), consentController.deleteConsent);

module.exports = router;
