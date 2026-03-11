/**
 * services/reportExportService.js
 * 
 * Orchestrates the full DICOM reporting pipeline:
 * 1. Generates PDF buffer
 * 2. Generates DICOM SR
 * 3. Generates DICOM Encapsulated PDF
 * 4. Pushes to PACS via DIMSE C-STORE
 * 5. Logs to report_dicom_objects
 */

const { pool } = require('../config/postgres');
const pdfService = require('./pdfService');
const srService = require('./srService');
const dicomPdfService = require('./dicomPdfService');
const dayjs = require('dayjs');
const path = require('path');
const fs = require('fs');

/**
 * Trigger the DICOM export for a finalized report.
 * 
 * @param {string} studyUID
 * @param {number} userId - The radiologist who signed it
 */
async function processDicomExport(studyUID, userId) {
    console.log(`🚀 [Export] Starting DICOM pipeline for ${studyUID}...`);
    try {
        // 1. Get Report Data
        const rReport = await pool.query(
            "SELECT * FROM pacs_reports WHERE study_instance_uid = $1",
            [studyUID]
        );
        if (rReport.rowCount === 0) throw new Error("Report not found");
        const report = rReport.rows[0];

        // 2. Get User/Observer Data
        const rUser = await pool.query("SELECT full_name FROM users WHERE id = $1", [userId]);
        const observerName = rUser.rowCount > 0 ? rUser.rows[0].full_name : 'Radiologist';

        // 3. Get PACS Server (Dynamic Selection)
        // Prioritize servers marked as 'active' and 'primary'
        const rPacs = await pool.query(
            "SELECT id, name FROM pacs_servers WHERE is_active = true ORDER BY id ASC LIMIT 1"
        );
        if (rPacs.rowCount === 0) {
            console.warn("⚠️ [Export] No active PACS server found for push.");
            return;
        }
        const pacsServerId = rPacs.rows[0].id;
        const pacsName     = rPacs.rows[0].name;

        const reportMetadata = {
            studyInstanceUID: report.study_instance_uid,
            patientID: report.patient_id,
            patientName: report.patient_name,
            accessionNumber: report.accession_number,
            modality: report.modality,
            reportTitle: report.report_title || "Radiology Report",
            observerName: observerName
        };

        // 4. Clean Plain Text for SR 
        // We use a more aggressive regex to preserve line breaks while removing HTML
        const plainText = report.content
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n')
            .replace(/<[^>]*>/g, '')
            .replace(/\n\s*\n/g, '\n')
            .trim();

        // 5. Generate and Send SR
        try {
            const { buffer, sopInstanceUID, seriesInstanceUID } = await srService.generateSR(reportMetadata, plainText);
            
            await srService.saveAndSendSR(reportMetadata, plainText, pacsServerId);
            await logDicomObject(report.id, studyUID, seriesInstanceUID, sopInstanceUID, 'SR', pacsServerId, 'sent');
            console.log(`✅ [Export] SR pushed to ${pacsName}: ${sopInstanceUID}`);
        } catch (err) {
            console.error(`❌ [Export] SR push failed:`, err.message);
            await logDicomObject(report.id, studyUID, 'N/A', 'N/A', 'SR', pacsServerId, 'failed', err.message);
        }

        // 6. Generate and Send Encapsulated PDF
        try {
            const html = `<html><body>${report.content}</body></html>`; 
            const pdfBuffer = await pdfService.generatePdfBuffer(html);
            const { buffer: dicomBuffer, sopInstanceUID: pdfSopUID, seriesInstanceUID: pdfSeriesUID } = await dicomPdfService.wrapPdfToDicom(reportMetadata, pdfBuffer);

            await dicomPdfService.generateAndSendDicomPdf(reportMetadata, pdfBuffer, pacsServerId);
            await logDicomObject(report.id, studyUID, pdfSeriesUID, pdfSopUID, 'PDF', pacsServerId, 'sent');
            console.log(`✅ [Export] DICOM PDF pushed to ${pacsName}: ${pdfSopUID}`);
        } catch (err) {
            console.error(`❌ [Export] DICOM PDF push failed:`, err.message);
            await logDicomObject(report.id, studyUID, 'N/A', 'N/A', 'PDF', pacsServerId, 'failed', err.message);
        }

    } catch (err) {
        console.error("💥 [reportExportService] Global export failure:", err.message);
    }
}

/**
 * Log to DB.
 */
async function logDicomObject(reportId, studyUID, seriesUID, sopUID, type, pacsId, status, error = null) {
    try {
        await pool.query(
            `INSERT INTO report_dicom_objects 
            (report_id, study_instance_uid, series_instance_uid, sop_instance_uid, object_type, pacs_server_id, status, error_message, pushed_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
            [reportId, studyUID, seriesUID, sopUID, type, pacsId, status, error]
        );
    } catch (e) {
        console.error("Failed to log DICOM object:", e.message);
    }
}

module.exports = {
    processDicomExport
};
