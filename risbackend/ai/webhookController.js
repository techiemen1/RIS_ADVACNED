// ai/webhookController.js
const { pool } = require("../config/postgres");
const notificationService = require("../services/notificationService");

/**
 * Webhook Controller
 * Handlers for external Clinical AI systems to push findings
 */
exports.ingestAIFindings = async (req, res) => {
    const { studyInstanceUID, findings, metadata, isCritical } = req.body;

    if (!studyInstanceUID || !findings) {
        return res.status(400).json({ success: false, message: "Missing studyInstanceUID or findings" });
    }

    try {
        console.log(`📥 [AI Webhook] Received findings for ${studyInstanceUID} (Critical: ${isCritical})`);

        // 1. Update Database with AI Results
        const result = await pool.query(
            `UPDATE pacs_studies 
       SET ai_findings = $1, 
           ai_status = 'analyzed', 
           is_critical = $2, 
           ai_metadata = $3,
           updated_at = NOW()
       WHERE study_instance_uid = $4
       RETURNING *`,
            [findings, isCritical || false, metadata || {}, studyInstanceUID]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Study not found in cache" });
        }

        const study = result.rows[0];

        // 2. Trigger Critical Alert Workflow if needed
        // Keywords detection fallback if isCritical is not explicitly true
        const panicKeywords = ["Pneumothorax", "Intracranial Hemorrhage", "Stroke", "Aortic Dissection", "Panic", "Critical"];
        const containsPanic = panicKeywords.some(kw => findings.toLowerCase().includes(kw.toLowerCase()));

        if (isCritical || containsPanic) {
            await notificationService.sendCriticalAlert(study, findings);
        }

        res.json({ success: true, message: "Findings ingested successfully", critical: isCritical || containsPanic });
    } catch (err) {
        console.error("❌ [AI Webhook] Error:", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
