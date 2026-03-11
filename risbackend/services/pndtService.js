// risbackend/services/pndtService.js
const db = require('../db');
const dayjs = require('dayjs');

/**
 * Service for PNDT (Pre-Natal Diagnostic Techniques) Act Compliance
 * Handles Form F generation, statutory reporting, and legal validation.
 */
class PNDTService {

    /**
     * Automatic Identification of PNDT Procedures
     * Checks if a study requires Form F based on Modality and Description.
     */
    async checkPndtRequirement(studyId, modality, patient) {
        // Trigger for USG on Female patients of reproductive age
        if (modality === 'USG' && patient.gender === 'F' && patient.age >= 12 && patient.age <= 55) {
            return { requires_form_f: true, message: 'Prenatal diagnostic procedure detected. Form F mandatory.' };
        }
        return { requires_form_f: false };
    }

    /**
     * Core Form-F Logic (M1: Legal Validation)
     * Ensures all fields are present before certification.
     */
    async validateFormF(formData) {
        const requiredFields = ['patient_name', 'husband_name', 'address', 'lmp_date', 'indication_for_scan'];
        for (const field of requiredFields) {
            if (!formData[field]) {
                throw new Error(`PNDT Violation: Missing mandatory field ${field}`);
            }
        }
        return true;
    }

    /**
     * Save Form F with Digital Signatures
     */
    async saveCertifiedForm(patientId, studyId, data) {
        const { formData, patientSig, doctorSig } = data;

        await this.validateFormF(formData);

        const query = `
            INSERT INTO pndt_forms (patient_id, study_id, form_data, patient_signature_svg, doctor_signature_svg, is_signed, certified_at)
            VALUES ($1, $2, $3, $4, $5, TRUE, NOW())
            RETURNING id;
        `;
        const res = await db.query(query, [patientId, studyId, JSON.stringify(formData), patientSig, doctorSig]);
        return res.rows[0];
    }

    /**
     * M2: Monthly Statutory Report Generation
     * Fetches all Form F data for a given month for reporting to local CMO.
     */
    async generateMonthlyReport(month, year) {
        const startDate = dayjs(`${year}-${month}-01`).startOf('month').toISOString();
        const endDate = dayjs(`${year}-${month}-01`).endOf('month').toISOString();

        const query = `
            SELECT pf.*, p.first_name, p.last_name, p.age
            FROM pndt_forms pf
            JOIN patients p ON pf.patient_id = p.id
            WHERE pf.certified_at BETWEEN $1 AND $2
            ORDER BY pf.certified_at ASC;
        `;
        const res = await db.query(query, [startDate, endDate]);

        return {
            month,
            year,
            total_forms: res.rowCount,
            forms: res.rows
        };
    }
}

module.exports = new PNDTService();
