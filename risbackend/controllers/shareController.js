const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const { pool } = require('../config/postgres');

// Twilio Config
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER; // For SMS
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'; // Twilio Sandbox default

// SMTP Config
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || '"RIS System" <ris@hospital.com>';

// Shared Reports Directory
const SHARED_DIR = path.join(__dirname, '../uploads/shared_reports');
if (!fs.existsSync(SHARED_DIR)) fs.mkdirSync(SHARED_DIR, { recursive: true });

/**
 * Ensures temporary file storage exists
 */
const TEMP_DIR = path.join(__dirname, '../uploads/temp_shares');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

/**
 * Handles sharing report via Email/SMS/WhatsApp
 */
exports.shareReport = async (req, res) => {
    try {
        if (!req.files || !req.files.pdf) {
            return res.status(400).json({ success: false, message: "No PDF file uploaded" });
        }

        const { type, recipient } = req.body; // type: 'email' | 'sms' | 'whatsapp'
        const pdfFile = req.files.pdf;
        const metadata = req.body.metadata ? JSON.parse(req.body.metadata) : {};

        // Use a persistent filename for public sharing (Accession + Timestamp)
        // Sanitizing accession number to be safe for filenames
        const safeAccession = (metadata.accessionNumber || 'report').replace(/[^a-z0-9]/gi, '_');
        const filename = `${safeAccession}_${Date.now()}.pdf`;
        const filePath = path.join(SHARED_DIR, filename);

        // Public URL Generation
        const protocol = req.protocol;
        const host = req.get('host');
        const publicUrl = `${protocol}://${host}/api/share/public/${filename}`;

        console.log(`[SHARE] Processing ${type} to ${recipient}. Public URL: ${publicUrl}`);

        // 1. Save File to Shared Directory (Persists for 7 days)
        await pdfFile.mv(filePath);

        // Immediate Response for UX - Return the link so frontend can use it too!
        res.json({
            success: true,
            message: `Request received. Sending ${type} ...`,
            publicUrl: publicUrl
        });

        // 2. Dispatch based on type (Background Process)
        (async () => {
            try {
                if (type === 'email') {
                    // Email gets Attachment + Link
                    await sendEmail(recipient, filePath, publicUrl, metadata);
                    console.log(`[SHARE SUCCESS] Email sent to ${recipient}`);
                } else if (type === 'sms' || type === 'whatsapp') {
                    // SMS/WhatsApp gets Link Only (or brief message with link)
                    const msg = metadata.patientName
                        ? `Hello ${metadata.patientName}, your medical report (Acc: ${metadata.accessionNumber}) is ready. View it here: ${publicUrl}`
                        : `Your medical report is ready. View it here: ${publicUrl}`;

                    if (type === 'sms') {
                        if (TWILIO_ACCOUNT_SID && TWILIO_ACCOUNT_SID.startsWith('AC')) {
                            await sendSMS(recipient, msg);
                            console.log(`[SHARE SUCCESS] SMS sent to ${recipient}`);
                        } else {
                            console.log(`[SHARE INFO] Server-side SMS skipped (No Twilio). Client will handle via Native App.`);
                        }
                    } else {
                        if (TWILIO_ACCOUNT_SID && TWILIO_ACCOUNT_SID.startsWith('AC')) {
                            await sendWhatsApp(recipient, msg);
                            console.log(`[SHARE SUCCESS] WhatsApp sent to ${recipient}`);
                        } else {
                            console.log(`[SHARE INFO] Server-side WhatsApp skipped (No Twilio). Client will handle via Native App.`);
                        }
                    }
                }
            } catch (bgError) {
                console.error(`[SHARE BACKGROUND ERROR] Failed to send ${type} to ${recipient}:`, bgError.message);
                // We don't delete the file on error, so the user can still manualy share the link if needed
            }
        })();

    } catch (error) {
        console.error("[SHARE ERROR]", error);
        res.status(500).json({ success: false, message: `Failed to share: ${error.message}` });
    }
};

/**
 * Serve Public Report with 7-Day Expiry
 */
exports.getPublicReport = (req, res) => {
    try {
        const { filename } = req.params;

        // Security: Prevent directory traversal
        const safeFilename = path.basename(filename);
        const filePath = path.join(SHARED_DIR, safeFilename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).send("Report not found or expired.");
        }

        // Check Age (7 Days = 7 * 24 * 60 * 60 * 1000 ms)
        const stats = fs.statSync(filePath);
        const now = Date.now();
        const fileAge = now - stats.mtimeMs;
        const MAX_AGE = 7 * 24 * 60 * 60 * 1000;

        if (fileAge > MAX_AGE) {
            // Expired: Delete and return 410
            fs.unlinkSync(filePath); // Cleanup
            return res.status(410).send("This report link has expired (valid for 7 days). Please contact the hospital.");
        }

        // Serve File
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
        const readStream = fs.createReadStream(filePath);
        readStream.pipe(res);

    } catch (err) {
        console.error("getPublicReport Error:", err);
        res.status(500).send("Internal Server Error");
    }
};

async function sendEmail(to, attachmentPath, link, meta = {}) {
    if (!SMTP_USER || !SMTP_PASS) {
        console.warn("SMTP Credentials not configured. Email skipped.");
        return;
    }

    const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: false, // true for 465, false for other ports
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
        },
    });

    const subject = meta.patientName
        ? `Medical Report: ${meta.patientName} - ${meta.accessionNumber}`
        : "Medical Report - Result Notification";

    const text = meta.patientName
        ? `Dear Patient,\n\nPlease find attached the medical report for:\n\nPatient Name: ${meta.patientName}\nAccession: ${meta.accessionNumber}\nDate: ${meta.studyDate}\n\nYou can also view/download the report via this secure link (valid for 7 days):\n${link}\n\nRegards,\n${meta.hospitalName || 'Radiology Department'}`
        : `Please find your medical report attached.\n\nView online: ${link}`;

    await transporter.sendMail({
        from: EMAIL_FROM,
        to: to,
        subject: subject,
        text: text,
        attachments: [
            {
                filename: 'Medical_Report.pdf',
                path: attachmentPath
            }
        ]
    });
}

async function sendSMS(to, body) {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_ACCOUNT_SID.startsWith('AC')) {
        console.warn("Twilio SMS credentials missing/invalid. SMS skipped.");
        return;
    }
    const client = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    await client.messages.create({
        body: body,
        from: TWILIO_PHONE_NUMBER,
        to: to
    });
}

async function sendWhatsApp(to, body) {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_ACCOUNT_SID.startsWith('AC')) {
        console.warn("Twilio WhatsApp credentials missing/invalid. WhatsApp skipped.");
        return;
    }
    const client = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    await client.messages.create({
        body: body,
        from: TWILIO_WHATSAPP_NUMBER,
        to: `whatsapp:${to}`
    });
}
