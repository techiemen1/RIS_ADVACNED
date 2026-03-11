// risbackend/controllers/indianSegmentController.js
const abdmService = require('../services/abdmService');
const pndtService = require('../services/pndtService');
const commService = require('../services/communicationService');
const referralService = require('../services/referralService');

/**
 * Unified Controller for all Indian Segment Specialized Features
 */
class IndianSegmentController {

    // 1. ABDM Endpoints
    async verifyAbha(req, res) {
        try {
            const { abhaNumber, otp, txnId } = req.body;
            const result = await abdmService.verifyAbhaOtp(abhaNumber, otp, txnId);
            res.status(200).json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // 2. PNDT Endpoints
    async certifyPndtForm(req, res) {
        try {
            const { patientId, studyId, data } = req.body;
            const result = await pndtService.saveCertifiedForm(patientId, studyId, data);
            res.status(201).json(result);
        } catch (error) {
            res.status(403).json({ error: error.message });
        }
    }

    async getMonthlyPndtReport(req, res) {
        try {
            const { month, year } = req.query;
            const report = await pndtService.generateMonthlyReport(month, year);
            res.status(200).json(report);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // 3. Referral Endpoints
    async getDoctorReferrals(req, res) {
        try {
            const doctorId = req.user.id; // From auth middleware
            const ledger = await referralService.getDoctorLedger(doctorId);
            res.status(200).json(ledger);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // 4. Communication Dispatch
    async sendReportNotification(req, res) {
        try {
            const { patientId, reportData } = req.body;
            // Fetch patient from DB first...
            await commService.deliverReport({ id: patientId, ...req.body.patient }, reportData);
            res.status(200).json({ message: 'Notifications dispatched' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new IndianSegmentController();
