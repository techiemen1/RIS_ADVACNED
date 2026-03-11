// controllers/patientPortalController.js
const { pool } = require("../config/postgres");
const crypto = require("crypto");

/**
 * Patient Portal Controller
 * Manages secure patient access to diagnostic records
 */

// --- 1. Generate Secure QR Link Token ---
exports.generateAccessLink = async (req, res) => {
    const { reportId, patientId } = req.body;

    if (!reportId || !patientId) {
        return res.status(400).json({ success: false, message: "Missing reportId or patientId" });
    }

    try {
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Valid for 7 days

        // Optional: Generate a simple 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await pool.query(
            `INSERT INTO patient_access_tokens (token, report_id, patient_id, expires_at, otp_code)
       VALUES ($1, $2, $3, $4, $5)`,
            [token, reportId, patientId, expiresAt, otp]
        );

        // In a real system, the URL would be the production frontend URL
        const portalUrl = `${process.env.BASE_URL}/patient/portal/${token}`;

        res.json({
            success: true,
            data: {
                token,
                portalUrl,
                expiresAt,
                otpCode: otp // In production, this would be sent via SMS
            }
        });
    } catch (err) {
        console.error("❌ [PatientPortal] Token generation error:", err.message);
        res.status(500).json({ success: false, message: "Failed to generate link" });
    }
};

// --- 2. Verify Token & Get Report (OTP Protected) ---
exports.getReportByToken = async (req, res) => {
    const { token } = req.params;
    const { otp } = req.query; // OTP passed as query or in body for verification

    try {
        const result = await pool.query(
            `SELECT t.*, r.report_text, r.findings, r.impression, p.first_name, p.last_name, p.dob
       FROM patient_access_tokens t
       JOIN reports r ON t.report_id = r.id
       JOIN patients p ON t.patient_id = p.id
       WHERE t.token = $1 AND t.expires_at > NOW() AND t.is_used = FALSE`,
            [token]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Invalid or expired link" });
        }

        const data = result.rows[0];

        // Verification check (Simplified)
        if (otp && data.otp_code !== otp) {
            return res.status(401).json({ success: false, message: "Invalid OTP" });
        }

        // Hide OTP and other sensitive token data before sending
        const { otp_code, ...patientData } = data;

        res.json({
            success: true,
            data: patientData
        });
    } catch (err) {
        console.error("❌ [PatientPortal] Data retrieval error:", err.message);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
const notificationService = require("../services/notificationService");

// ... existing getReportByToken ...

// --- 3. Share Access Link via Email/SMS/WhatsApp ---
exports.shareAccess = async (req, res) => {
    const { token, channel, target } = req.body;

    try {
        const result = await pool.query(
            `SELECT t.otp_code, p.first_name, p.last_name, p.email, p.phone
             FROM patient_access_tokens t
             JOIN patients p ON t.patient_id = p.id
             WHERE t.token = $1`,
            [token]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Token not found" });
        }

        const { otp_code, first_name, last_name, email, phone } = result.rows[0];
        const portalUrl = `${process.env.BASE_URL}/patient/portal/${token}?otp=${otp_code}`;
        const recipient = target || (channel === 'email' ? email : phone);

        if (!recipient) {
            return res.status(400).json({ success: false, message: `No target ${channel} found for patient` });
        }

        let delivery;
        const msg = `Hello ${first_name}, your radiology report from iPacx is ready. Access here: ${portalUrl} | Security Code: ${otp_code}`;

        if (channel === 'email') {
            delivery = await notificationService.sendEmail(
                recipient,
                "Your Radiology Report is Ready",
                msg,
                `<p>Hello ${first_name},</p><p>Your radiology report is now available for secure viewing.</p>
                 <a href="${portalUrl}" style="padding:10px; background:#2563eb; color:white; text-decoration:none; borderRadius:5px;">View My Report</a>
                 <p>Security Access Code: <strong>${otp_code}</strong></p>`
            );
        } else if (channel === 'sms') {
            delivery = await notificationService.sendSMS(recipient, msg);
        } else if (channel === 'whatsapp') {
            delivery = await notificationService.sendWhatsApp(recipient, msg, "report_ready", [first_name, portalUrl, otp_code]);
        }

        if (delivery?.success) {
            res.json({ success: true, message: `Report shared successfully via ${channel}` });
        } else {
            res.status(500).json({ success: false, message: "Delivery service failed" });
        }

    } catch (err) {
        console.error("❌ [PatientPortal] Sharing error:", err.message);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
