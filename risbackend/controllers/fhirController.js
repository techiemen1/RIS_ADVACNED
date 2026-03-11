// controllers/fhirController.js
const { pool } = require("../config/postgres");

/**
 * FHIR R4 Controller
 * Maps internal data to HL7 FHIR standards
 */

// --- 1. FHIR Patient Mapping ---
exports.getPatientResource = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query("SELECT * FROM patients WHERE id = $1", [id]);
        if (result.rowCount === 0) return res.status(404).json({ resourceType: "OperationOutcome", issue: [{ severity: "error", code: "not-found" }] });

        const p = result.rows[0];
        const fhirPatient = {
            resourceType: "Patient",
            id: p.id.toString(),
            identifier: [{ system: "http://hospital.org/mrn", value: p.patient_id || p.id.toString() }],
            name: [{ family: p.last_name, given: [p.first_name], text: `${p.first_name} ${p.last_name}` }],
            gender: p.gender ? p.gender.toLowerCase() : "unknown",
            birthDate: p.dob ? new Date(p.dob).toISOString().split("T")[0] : undefined,
            telecom: [{ system: "phone", value: p.phone, use: "mobile" }],
            address: [{ text: p.address }]
        };

        res.json(fhirPatient);
    } catch (err) {
        res.status(500).json({ resourceType: "OperationOutcome", issue: [{ severity: "error", code: "exception", diagnostics: err.message }] });
    }
};

// --- 2. FHIR DiagnosticReport Mapping ---
exports.getDiagnosticReportResource = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `SELECT r.*, p.patient_id as mrn, p.first_name, p.last_name, w.accession_number, w.modality, w.study_date
       FROM reports r
       JOIN patients p ON r.patient_id = p.id
       JOIN worklist w ON r.worklist_id = w.id
       WHERE r.id = $1`,
            [id]
        );

        if (result.rowCount === 0) return res.status(404).json({ resourceType: "OperationOutcome", issue: [{ severity: "error", code: "not-found" }] });

        const r = result.rows[0];
        const fhirReport = {
            resourceType: "DiagnosticReport",
            id: r.id.toString(),
            status: r.status === "finalized" ? "final" : "preliminary",
            category: [{ coding: [{ system: "http://loinc.org", code: "LP29684-5", display: "Radiology" }] }],
            code: { coding: [{ system: "http://loinc.org", code: "72106-8", display: `${r.modality} Report` }] },
            subject: { reference: `Patient/${r.patient_id}`, display: `${r.first_name} ${r.last_name}` },
            effectiveDateTime: r.study_date ? new Date(r.study_date).toISOString() : undefined,
            issued: new Date(r.created_at).toISOString(),
            performer: [{ display: r.radiologist }],
            conclusion: r.impression,
            conclusionCode: [{ text: "Radiology Finding" }],
            presentedForm: [
                {
                    contentType: "text/plain",
                    data: Buffer.from(r.report_text || "").toString("base64")
                }
            ]
        };

        res.json(fhirReport);
    } catch (err) {
        res.status(500).json({ resourceType: "OperationOutcome", issue: [{ severity: "error", code: "exception", diagnostics: err.message }] });
    }
};
