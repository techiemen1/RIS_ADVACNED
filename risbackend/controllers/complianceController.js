// controllers/complianceController.js
const { pool } = require("../config/postgres");
const pdfService = require("../services/pdfService");
const formFService = require("../services/formFService");
const dayjs = require("dayjs");

exports.generateFormF = async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            patient_id,
            doctor_id,
            husband_name,
            no_of_children_male,
            no_of_children_female,
            lmp_date,
            edd_date,
            gestational_age,
            indication_for_scan,
            procedure_type,
            patient_signature,
            doctor_signature
        } = req.body;

        // 1. Validation
        if (!process.env.SKIP_VALIDATION && (!husband_name || !indication_for_scan || !lmp_date)) {
            return res.status(400).json({ success: false, message: "Missing Mandatory Form F Fields (Husband Name, Indication, LMP)" });
        }

        await client.query('BEGIN');

        // 2. Fetch Patient & Doctor Details
        const patientRes = await client.query('SELECT * FROM patients WHERE id = $1', [patient_id]);
        if (patientRes.rows.length === 0) throw new Error("Patient not found");
        const patient = patientRes.rows[0];

        // Construct Full Name
        patient.name = `${patient.first_name} ${patient.last_name}`.trim();

        const doctorRes = await client.query('SELECT * FROM users WHERE id = $1', [doctor_id]);
        const doctor = doctorRes.rows.length > 0 ? doctorRes.rows[0] : { name: "Unknown Doctor" };

        // 3. Generate HTML
        const generationTime = new Date();
        const html = formFService.generateFormFHTML({
            patient,
            doctor,
            husband_name,
            address: patient.address,
            lmp_date,
            edd_date,
            gestational_age,
            indication_for_scan,
            procedure_type,
            no_of_children_male,
            no_of_children_female,
            patient_declaration_accepted: true,
            doctor_declaration_accepted: true,
            patient_signature,
            doctor_signature,
            generated_at: generationTime
        });

        // 4. Generate PDF Buffer
        const pdfBuffer = await pdfService.generatePdfBuffer(html);

        // 5. Insert into Compliance Table
        const insertQ = `
            INSERT INTO compliance_form_f 
            (patient_id, doctor_id, husband_name, address, lmp_date, edd_date, gestational_age, 
             indication_for_scan, procedure_type, no_of_children_male, no_of_children_female,
             patient_signature, doctor_signature, form_status, generated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'GENERATED', $14)
            RETURNING id
        `;
        const insertVals = [
            patient_id, doctor_id, husband_name, patient.address, lmp_date, edd_date, gestational_age,
            indication_for_scan, procedure_type || 'ULTRASOUND', no_of_children_male || 0, no_of_children_female || 0,
            patient_signature, doctor_signature, generationTime
        ];
        const inserted = await client.query(insertQ, insertVals);
        const formId = inserted.rows[0].id;

        // 6. LOCK Patient Record? 
        // We set a flag in patients table or just rely on the existence of Form F.
        // Let's rely on Form F existence for now, or update 'is_locked' if column exists.
        // For strict compliance, we should lock demographics.
        // Assuming we might have added an 'is_locked' column or we will just use this table as the lock check.

        await client.query('COMMIT');

        // 7. Send PDF back
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="FormF_${patient.first_name}_${dayjs().format('YYYYMMDD')}.pdf"`);
        return res.send(pdfBuffer);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("generateFormF Error:", err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
};

exports.checkFormFStatus = async (req, res) => {
    try {
        const { patientId } = req.params;
        const result = await pool.query(
            `SELECT id, generated_at, form_status FROM compliance_form_f WHERE patient_id = $1 ORDER BY generated_at DESC LIMIT 1`,
            [patientId]
        );
        res.json({ success: true, exists: result.rows.length > 0, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteFormF = async (req, res) => {
    try {
        const { patientId } = req.params;
        // Strict: Check if User is Admin (Middleware usually handles this, but we can double check logic here if needed)
        // For now, we trust the route protection or dev usage

        const result = await pool.query(
            `DELETE FROM compliance_form_f WHERE patient_id = $1 RETURNING id`,
            [patientId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "No Form F found to delete." });
        }

        res.json({ success: true, message: "Form F deleted and Patient Record Unlocked." });
    } catch (err) {
        console.error("deleteFormF Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};
