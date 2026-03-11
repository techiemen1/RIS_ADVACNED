const { pool } = require('../db');

exports.createConsent = async ({ patient_id, consent_type, signed_by, ip_address, consent_text }) => {
    const result = await pool.query(
        `INSERT INTO patient_consents 
     (patient_id, consent_type, status, signed_by, signed_at, ip_address, consent_text, created_at)
     VALUES ($1, $2, 'SIGNED', $3, CURRENT_TIMESTAMP, $4, $5, CURRENT_TIMESTAMP)
     RETURNING *`,
        [patient_id, consent_type, signed_by, ip_address, consent_text]
    );
    return result.rows[0];
};

exports.getConsentsByPatient = async (patient_id) => {
    const result = await pool.query(
        `SELECT * FROM patient_consents WHERE patient_id = $1 ORDER BY created_at DESC`,
        [patient_id]
    );
    return result.rows;
};

exports.revokeConsent = async (id, revoked_by) => { // revoked_by could be used for audit log in controller
    const result = await pool.query(
        `UPDATE patient_consents 
     SET status = 'REVOKED', updated_at = CURRENT_TIMESTAMP 
     WHERE id = $1 RETURNING *`,
        [id]
    );
    return result.rows[0];
};

exports.deleteConsent = async (id) => {
    const result = await pool.query(
        `DELETE FROM patient_consents WHERE id = $1 RETURNING *`,
        [id]
    );
    return result.rows[0];
};
