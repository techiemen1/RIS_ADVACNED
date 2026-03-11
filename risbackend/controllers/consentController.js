const { createConsent, getConsentsByPatient, revokeConsent, deleteConsent } = require('../models/consentModel');
const { logAction } = require('./auditController');

exports.addConsent = async (req, res) => {
    try {
        const { patient_id, consent_type, consent_text } = req.body;
        const signed_by = req.body.signed_by || req.user.username; // Use provided name or logged in user
        const ip_address = req.ip;

        const consent = await createConsent({
            patient_id,
            consent_type,
            signed_by,
            ip_address,
            consent_text
        });

        await logAction(req.user.username, req.user.role, `Signed consent ${consent_type} for patient ${patient_id}`);
        res.json(consent);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to sign consent' });
    }
};

exports.getConsents = async (req, res) => {
    try {
        const consents = await getConsentsByPatient(req.params.patientId);
        res.json(consents);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch consents' });
    }
};

exports.revokeConsent = async (req, res) => {
    try {
        await revokeConsent(req.params.id, req.user.username);
        await logAction(req.user.username, req.user.role, `Revoked consent ${req.params.id}`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to revoke consent' });
    }
};

exports.deleteConsent = async (req, res) => {
    try {
        await deleteConsent(req.params.id);
        await logAction(req.user.username, req.user.role, `Deleted consent ${req.params.id}`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete consent' });
    }
};
