// controllers/referringPortalController.js
const { pool } = require("../config/postgres");
const pacsService = require("../services/pacsService");

/**
 * GET /api/referring/studies
 * Fetch studies where the logged-in user is the referring physician
 */
exports.getReferralStudies = async (req, res) => {
    try {
        const doctorName = req.user.full_name; // Assuming full_name is in JWT
        if (!doctorName) {
            return res.status(400).json({ success: false, message: "Doctor profile name missing" });
        }

        // 1. Fetch uids from local metadata where referring physician matches
        const metaRes = await pool.query(
            `SELECT study_instance_uid, patient_name, modality, study_date, patient_id 
       FROM study_metadata 
       WHERE LOWER(referring_physician) = LOWER($1)
       ORDER BY created_at DESC LIMIT 100`,
            [doctorName]
        );

        const studies = metaRes.rows;

        // 2. Cross-reference with Reports to get completion status
        const uids = studies.map(s => s.study_instance_uid);
        let reportMap = {};
        if (uids.length > 0) {
            const reports = await pool.query(
                `SELECT study_instance_uid, status FROM pacs_reports WHERE study_instance_uid = ANY($1)`,
                [uids]
            );
            reports.rows.forEach(r => {
                reportMap[r.study_instance_uid] = r.status;
            });
        }

        const finalStudies = studies.map(s => ({
            studyUID: s.study_instance_uid,
            patientName: s.patient_name,
            patientID: s.patient_id,
            modality: s.modality,
            date: s.study_date,
            reportStatus: reportMap[s.study_instance_uid] || "pending"
        }));

        res.json({ success: true, data: finalStudies });
    } catch (err) {
        console.error("referringPortalController.getReferralStudies", err);
        res.status(500).json({ success: false, message: "Server error fetching referrals" });
    }
};

/**
 * GET /api/referring/report/:studyUID
 * Get finalized report for a referral
 */
exports.getReferralReport = async (req, res) => {
    const { studyUID } = req.params;
    const doctorName = req.user.full_name;

    try {
        // 1. Security Check: Is this doctor entitled to see this study?
        const check = await pool.query(
            `SELECT study_instance_uid FROM study_metadata 
       WHERE study_instance_uid = $1 AND LOWER(referring_physician) = LOWER($2)`,
            [studyUID, doctorName]
        );

        if (check.rowCount === 0) {
            return res.status(403).json({ success: false, message: "Access denied to this clinical record" });
        }

        // 2. Fetch report
        const reportRes = await pool.query(
            `SELECT * FROM pacs_reports WHERE study_instance_uid = $1 AND status = 'final'`,
            [studyUID]
        );

        if (reportRes.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Finalized report not available" });
        }

        res.json({ success: true, data: reportRes.rows[0] });
    } catch (err) {
        console.error("referringPortalController.getReferralReport", err);
        res.status(500).json({ success: false, message: "Server error fetching report" });
    }
};
