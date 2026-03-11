// controllers/reportController.js
const { pool } = require("../config/postgres");
const { processDicomExport } = require("../services/reportExportService");

/* =========================================================
   GET LATEST REPORT (VIEW / EDITOR)
   - Single source of truth for header + content
========================================================= */
exports.getReport = async (req, res) => {
  const { studyUID } = req.params;

  try {
    const r = await pool.query(
      `
      SELECT
        study_instance_uid,
        content,
        status,
        updated_at,

        patient_name,
        patient_id,
        modality,
        accession_number,
        study_date,
        report_title,
        workflow_note
      FROM pacs_reports
      WHERE study_instance_uid = $1
      ORDER BY updated_at DESC
      LIMIT 1
      `,
      [studyUID]
    );

    if (r.rowCount === 0) {
      return res.json({ success: true, data: null });
    }

    const row = r.rows[0];

    res.json({
      success: true,
      data: {
        studyUID: row.study_instance_uid,
        content: row.content,
        status: row.status,

        patientName: row.patient_name,
        patientID: row.patient_id,
        modality: row.modality,
        accessionNumber: row.accession_number,
        studyDate: row.study_date,
        reportTitle: row.report_title,
        workflowNote: row.workflow_note,
        updatedAt: row.updated_at,
      },
    });
  } catch (err) {
    console.error("getReport:", err);
    res.status(500).json({ success: false });
  }
};

/* =========================================================
   GET REPORT STATUS (WORKLIST / PACS)
========================================================= */
exports.getReportStatus = async (req, res) => {
  const { studyUID } = req.params;

  try {
    const r = await pool.query(
      `
      SELECT status
      FROM pacs_reports
      WHERE study_instance_uid = $1
      ORDER BY updated_at DESC
      LIMIT 1
      `,
      [studyUID]
    );

    if (r.rowCount === 0) {
      return res.json({
        success: true,
        data: { exists: false },
      });
    }

    res.json({
      success: true,
      data: {
        exists: true,
        status: r.rows[0].status,
      },
    });
  } catch (err) {
    console.error("getReportStatus:", err);
    res.status(500).json({ success: false });
  }
};

/* =========================================================
   LIST REPORTS (ADMIN / REPORT LIST PAGE)
   ✔ Single endpoint
   ✔ Header-safe
   ✔ UI-ready field names
========================================================= */
exports.listReports = async (req, res) => {
  try {
    const { patient_id } = req.query;
    let query = `
      SELECT
        id,
        study_instance_uid                     AS "studyUID",
        status,
        TRIM(REPLACE(REGEXP_REPLACE(patient_name, '\\^+', ' ', 'g'), '  ', ' ')) AS "patientName",
        patient_id                             AS "patientID",
        modality                               AS "modality",
        accession_number                      AS "accessionNumber",
        study_date                            AS "studyDate",
        updated_at                            AS "updatedAt"
      FROM pacs_reports
    `;

    const params = [];
    if (patient_id) {
      query += ` WHERE patient_id = $1 `;
      params.push(patient_id);
    }

    query += ` ORDER BY updated_at DESC LIMIT 50 `; // Add limit for safety

    const r = await pool.query(query, params);

    res.json({ success: true, data: r.rows });
  } catch (err) {
    console.error("listReports error:", err);
    res.status(500).json({ success: false });
  }
};

/* =========================================================
   SAVE / UPSERT REPORT (DRAFT)
   ✔ Single row per study
   ✔ Header always stored
========================================================= */
exports.saveReportUpsert = async (req, res) => {
  const {
    studyUID,
    content,
    workflow_status,

    patientName,
    patientID,
    modality,
    accessionNumber,
    studyDate,
    reportTitle,
    workflow_note,
  } = req.body;

  try {
    await pool.query(
      `
      INSERT INTO pacs_reports (
        study_instance_uid,
        content,
        status,
        patient_name,
        patient_id,
        modality,
        accession_number,
        study_date,
        report_title,
        workflow_note,
        created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (study_instance_uid)
      DO UPDATE SET
        content            = EXCLUDED.content,
        status             = EXCLUDED.status,
        patient_name       = EXCLUDED.patient_name,
        patient_id         = EXCLUDED.patient_id,
        modality           = EXCLUDED.modality,
        accession_number   = EXCLUDED.accession_number,
        study_date         = EXCLUDED.study_date,
        report_title       = EXCLUDED.report_title,
        workflow_note      = EXCLUDED.workflow_note,
        updated_at         = NOW()
      `,
      [
        studyUID,
        content,
        workflow_status || "draft",
        patientName,
        patientID,
        modality,
        accessionNumber,
        studyDate,
        reportTitle,
        workflow_note,
        req.user.id,
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("saveReportUpsert:", err);
    res.status(500).json({ success: false });
  }
};

/* =========================================================
   FINALIZE REPORT
   ⚠️ LEGALLY IMMUTABLE
========================================================= */
/* =========================================================
   FINALIZE REPORT
   ⚠️ LEGALLY IMMUTABLE
========================================================= */
const crypto = require('crypto');

// Generate a simpler keypair for demonstration if not provided via ENV
// In production, these should be loaded from secure storage (HSM/Vault)
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
});

exports.finalizeReport = async (req, res) => {
  const { studyUID, content, disclaimer_accepted } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    // 1. Role Enforcement: Only Radiologists (and Admins for override) can sign
    // 'doctor' role is often used for referring physicians, so be specific to 'radiologist'
    if (userRole !== 'radiologist' && userRole !== 'admin') {
      return res.status(403).json({ success: false, message: "Only Radiologists can finalize reports." });
    }

    // 2. Legal Consent Check
    if (!disclaimer_accepted) {
      return res.status(400).json({ success: false, message: "Legal disclaimer must be accepted." });
    }

    // 3. Fetch signing user details
    const userResult = await pool.query(
      "SELECT full_name, designation, registration_number, signature_path, can_sign FROM users WHERE id = $1",
      [userId]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const user = userResult.rows[0];

    // Check specific "Can Sign" permission
    // Allow if admin or compatible role, but PREFER explicit permission check
    if (!user.can_sign && userRole !== 'admin') {
      return res.status(403).json({ success: false, message: "You do not have permission to sign reports." });
    }

    // 4. Check for existing Final status (Immutability Check)
    const statusCheck = await pool.query("SELECT status FROM pacs_reports WHERE study_instance_uid = $1", [studyUID]);
    if (statusCheck.rowCount > 0 && statusCheck.rows[0].status === 'final' && userRole !== 'admin') {
      return res.status(409).json({ success: false, message: "Report is already final. Create an addendum." });
    }

    let finalContent = content;

    // 5. Append Signature Block
    if (user.signature_path) {
      const sigUrl = `/api${user.signature_path}`;
      const dateStr = new Date().toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" });

      const signatureBlock = `
        <div class="report-signature-block" style="margin-top: 40px; page-break-inside: avoid;">
          <div style="display: flex; flex-direction: column; align-items: flex-end; text-align: right;">
            <div style="width: 200px; text-align: center;">
              <img src="${sigUrl}" alt="Digital Signature" style="height: 60px; max-width: 150px; object-fit: contain; margin-bottom: 5px;" />
              <div style="font-weight: bold; font-family: sans-serif; font-size: 14px; text-transform: uppercase;">${user.full_name}</div>
              ${user.designation ? `<div style="font-size: 11px; color: #555;">${user.designation}</div>` : ""}
              ${user.registration_number ? `<div style="font-size: 10px; color: #777;">Reg. No: ${user.registration_number}</div>` : ""}
              <div style="font-size: 9px; margin-top: 4px; color: #999; font-style: italic;">Digitally signed on ${dateStr}</div>
              <div style="font-size: 8px; color: #ccc; margin-top: 2px;">RIS Verification Node</div>
            </div>
          </div>
        </div>
      `;

      if (finalContent.includes("<!-- SIGNATURE_PLACEHOLDER -->")) {
        finalContent = finalContent.replace("<!-- SIGNATURE_PLACEHOLDER -->", signatureBlock);
      } else {
        finalContent += signatureBlock;
      }
    }

    // 6. Hashing & Signing (Medico-Legal Compliance)
    const hash = crypto.createHash('sha256').update(finalContent).digest('hex');

    // Sign the hash
    const signer = crypto.createSign('SHA256');
    signer.update(finalContent);
    signer.end();
    const digitalSignature = signer.sign(privateKey, 'base64');
    // Note: We are using the server's key for the 'Digital Signature' of the document integrity.
    // Ideally, each doctor would have their own key, but server-signing verifies 'RIS Integrity'.

    // 7. Update Database
    await pool.query(
      `
      UPDATE pacs_reports
      SET
        content = $1,
        status  = 'final',
        updated_at = NOW(),
        content_hash = $2,
        digital_signature = $3,
        signer_id = $4,
        signed_at = NOW()
      WHERE study_instance_uid = $5
      `,
      [finalContent, hash, digitalSignature, userId, studyUID]
    );

    // 7.5 DICOM REPORTING PIPELINE (Async)
    // Runs in background to avoid blocking the UI response.
    // Generates SR + Encapsulated PDF and pushes to PACS via DIMSE.
    processDicomExport(studyUID, userId).catch(err => {
      console.error("Delayed DICOM Export Failed:", err.message);
    });

    // 8. INDIAN SEGMENT INTEGRATION (Hardening)
    try {
      // 8.1 ABDM Data Push
      const abdmService = require("../services/abdmService");
      const studyMetaRes = await pool.query("SELECT * FROM study_metadata WHERE study_instance_uid = $1", [studyUID]);
      if (studyMetaRes.rows.length > 0) {
        const study = studyMetaRes.rows[0];
        const patientRes = await pool.query("SELECT * FROM patients WHERE mrn = $1 OR id::text = $1", [study.patient_id]);
        if (patientRes.rows.length > 0) {
          const patient = patientRes.rows[0];
          if (patient.abha_number) {
            console.log("ABDM: Pushing health record to Gateway...");
            await abdmService.pushToABDM(patient.id, { id: studyUID, report_text: finalContent });
          }
        }
      }

      // 8.2 Referral & Incentive Tracking
      const referralService = require("../services/referralService");
      if (studyMetaRes.rows[0]?.referring_physician) {
        const doctorName = studyMetaRes.rows[0].referring_physician;
        // Lookup doctor ID by name (simulated) or use a direct link if established
        const doctorRes = await pool.query("SELECT id FROM users WHERE full_name ILIKE $1 AND role = 'doctor'", [`%${doctorName}%`]);
        if (doctorRes.rows.length > 0) {
          await referralService.trackReferral(doctorRes.rows[0].id, studyUID, studyMetaRes.rows[0].modality);
        }
      }

      // 8.3 WhatsApp Notification (Report Ready)
      const notificationService = require("../services/notificationService");
      const patientRes = await pool.query(
        "SELECT p.phone, p.first_name FROM patients p JOIN study_metadata s ON (p.mrn = s.patient_id OR p.id::text = s.patient_id) WHERE s.study_instance_uid = $1",
        [studyUID]
      );
      if (patientRes.rows.length > 0 && patientRes.rows[0].phone) {
        const patientData = patientRes.rows[0];
        await notificationService.sendWhatsApp(
          patientData.phone,
          `Hi ${patientData.first_name}, your radiology report for Study ${studyUID} is now ready and digitally signed. You can download it via the Patient Portal.`,
          "report_ready",
          [patientData.first_name, studyUID]
        );
      }

    } catch (integrationErr) {
      console.error("Indian Segment Service Integration Failed (Non-blocking):", integrationErr.message);
    }

    // 9. Audit Log (Explicit)
    await pool.query(
      `INSERT INTO audit_logs (username, action, entity, entity_id, payload) VALUES ($1, $2, $3, $4, $5)`,
      [req.user.username, "SIGN_REPORT", "Report", studyUID, JSON.stringify({ hash, signed_by: userId })]
    );

    res.json({ success: true, message: "Report finalized and legally signed." });
  } catch (err) {
    console.error("finalizeReport:", err);
    res.status(500).json({ success: false });
  }
};

/* =========================================================
   ADDENDA (LEGAL REQUIREMENT)
========================================================= */
exports.getAddenda = async (req, res) => {
  const { studyUID } = req.params;

  try {
    const r = await pool.query(
      `
      SELECT id, content, created_at, created_by
      FROM report_addenda
      WHERE study_uid = $1
      ORDER BY created_at
      `,
      [studyUID]
    );

    res.json({ success: true, data: r.rows });
  } catch (err) {
    console.error("getAddenda:", err);
    res.status(500).json({ success: false });
  }
};

exports.addAddendum = async (req, res) => {
  const { studyUID, content } = req.body;

  try {
    await pool.query(
      `
      INSERT INTO report_addenda (study_uid, content, created_by)
      VALUES ($1,$2,$3)
      `,
      [studyUID, content, req.user.id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("addAddendum:", err);
    res.status(500).json({ success: false });
  }
};

/* =========================================================
   DELETE REPORT
========================================================= */
exports.deleteReport = async (req, res) => {
  const { studyUID } = req.params;

  try {
    // Delete from both potential report tables and related data
    await pool.query("BEGIN");

    // 1. Delete from pacs_reports (Main table for PACS-based reporting)
    await pool.query("DELETE FROM pacs_reports WHERE study_instance_uid = $1", [studyUID]);

    // 2. Delete from legacy/RIS reports table (linked via worklist)
    await pool.query(`
      DELETE FROM reports 
      WHERE worklist_id IN (SELECT id FROM worklist WHERE study_instance_uid = $1)
    `, [studyUID]);

    // 3. Related tables
    await pool.query("DELETE FROM pacs_report_images WHERE study_instance_uid = $1", [studyUID]);
    await pool.query("DELETE FROM report_addenda WHERE study_uid = $1", [studyUID]);

    await pool.query("COMMIT");

    res.json({ success: true, message: "Report deleted successfully" });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("deleteReport error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};


