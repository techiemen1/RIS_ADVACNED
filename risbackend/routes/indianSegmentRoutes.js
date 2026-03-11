// risbackend/routes/indianSegmentRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/indianSegmentController');
const { verifyToken } = require('../middleware/auth'); // Assuming existing auth middleware

// ABDM
router.post('/abdm/abha/verify', verifyToken, controller.verifyAbha);

// PNDT Compliance
router.post('/pndt/certify', verifyToken, controller.certifyPndtForm);
router.get('/pndt/report-monthly', verifyToken, controller.getMonthlyPndtReport);

// Referral & Incentives
router.get('/referrals/ledger', verifyToken, controller.getDoctorReferrals);

// Communication
router.post('/notify/report-ready', verifyToken, controller.sendReportNotification);

module.exports = router;
