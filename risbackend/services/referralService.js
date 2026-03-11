// risbackend/services/referralService.js
const db = require('../db');

/**
 * Referral & Incentive Management Module
 * Tracks referring doctors and calculates incentives for the Indian market.
 */
class ReferralService {

    /**
     * Register a new study for incentive tracking
     * @param {string} doctorId 
     * @param {string} studyId 
     * @param {string} modality 
     */
    async trackReferral(doctorId, studyId, modality) {
        // Business Logic: Incentives vary by modality
        const rates = { 'MRI': 500, 'CT': 300, 'USG': 150, 'XR': 50 };
        const amount = rates[modality] || 0;

        // Basic Fraud Detection: Check if doctor has > 50 referrals in 24h
        const fraudCheck = await db.query(`
            SELECT COUNT(*) FROM referral_incentives 
            WHERE referring_doctor_id = $1 AND created_at > NOW() - INTERVAL '24 hours'
        `, [doctorId]);

        const logEntry = {
            action: 'CREATED',
            user: 'SYSTEM',
            fraud_flag: fraudCheck.rows[0].count > 50
        };

        const query = `
            INSERT INTO referral_incentives (referring_doctor_id, study_id, incentive_amount, audit_log)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (study_id) DO NOTHING;
        `;
        await db.query(query, [doctorId, studyId, amount, JSON.stringify([logEntry])]);
    }

    /**
     * Settlement Service: Mark incentives as PAID
     */
    async processSettlement(doctorId, studyIds) {
        const query = `
            UPDATE referral_incentives
            SET settlement_status = 'PAID', updated_at = NOW()
            WHERE referring_doctor_id = $1 AND study_id = ANY($2)
            AND settlement_status = 'PENDING';
        `;
        await db.query(query, [doctorId, studyIds]);
    }

    /**
     * Generate Comprehensive Doctor Ledger
     */
    async getDoctorLedger(doctorId) {
        const query = `
            SELECT ri.*, p.first_name, p.last_name, s.study_description
            FROM referral_incentives ri
            JOIN studies s ON ri.study_id = s.id
            JOIN patients p ON s.patient_id = p.id
            WHERE ri.referring_doctor_id = $1
            ORDER BY ri.created_at DESC;
        `;
        const res = await db.query(query, [doctorId]);
        return res.rows;
    }
}

module.exports = new ReferralService();
