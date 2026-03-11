/**
 * services/dicomPdfService.js
 * 
 * Wraps generated PDF report buffers into DICOM Encapsulated PDF objects.
 * SOP Class: Encapsulated PDF Storage (1.2.840.10008.5.1.4.1.1.104.1)
 */

const dcmjs = require('dcmjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');

/**
 * Wrap a PDF buffer into a DICOM dataset.
 * 
 * @param {Object} reportData - Metadata for DICOM tags
 * @param {Buffer} pdfBuffer - The raw PDF data
 * @returns {Object} { buffer, sopInstanceUID, seriesInstanceUID }
 */
async function wrapPdfToDicom(reportData, pdfBuffer) {
    try {
        const {
            studyInstanceUID,
            patientID,
            patientName,
            accessionNumber,
            reportTitle
        } = reportData;

        const uidPrefix = '1.2.826.0.1.3680043.2.1125.';
        const seriesInstanceUID = uidPrefix + uuidv4().replace(/-/g, '.').substring(0, 30);
        const sopInstanceUID = uidPrefix + uuidv4().replace(/-/g, '.').substring(0, 30);

        const dataset = {
            _vrMap: {
                EncapsulatedDocument: "OB" // Explicitly set VR for binary PDF
            },
            _meta: {
                FileMetaInformationGroupLength: 0,
                FileMetaInformationVersion: new Uint8Array([0, 1]).buffer,
                ImplementationClassUID: "1.2.826.0.1.3680043.2.1143.107.104.103.115.2.1.0",
                MediaStorageSOPClassUID: "1.2.840.10008.5.1.4.1.1.104.1", // Encapsulated PDF
                MediaStorageSOPInstanceUID: sopInstanceUID,
                TransferSyntaxUID: "1.2.840.10008.1.2.1",
            },

            // Patient Module
            PatientName: (patientName || 'ANONYMOUS').replace(/\^/g, ' ').trim(),
            PatientID: patientID || 'NO_ID',
            PatientBirthDate: '',
            PatientSex: '',

            // General Study Module
            StudyInstanceUID: studyInstanceUID,
            StudyDate: dayjs().format('YYYYMMDD'),
            StudyTime: dayjs().format('HHmmss'),
            AccessionNumber: accessionNumber || '',

            // Encapsulated Document Series Module
            Modality: 'DOC', // DOC is the modern preferred modality for these objects
            SeriesInstanceUID: seriesInstanceUID,
            SeriesNumber: "1002",

            // General Equipment Module
            Manufacturer: "iPacx RIS",
            StationName: "AI_REPORTING_NODE",

            // Encapsulated Document Module
            InstanceNumber: "1",
            SOPClassUID: "1.2.840.10008.5.1.4.1.1.104.1",
            SOPInstanceUID: sopInstanceUID,
            ContentDate: dayjs().format('YYYYMMDD'),
            ContentTime: dayjs().format('HHmmss'),
            AcquisitionDateTime: dayjs().format('YYYYMMDDHHmmss'),
            BurnedInAnnotation: "YES",
            DocumentTitle: reportTitle || "Radiology Report",
            MIMETypeOfEncapsulatedDocument: "application/pdf",
            EncapsulatedDocument: pdfBuffer
        };

        const meta = dataset._meta;
        delete dataset._meta;
        delete dataset._vrMap;

        // Convert Node.js Buffer to ArrayBuffer for dcmjs
        dataset.EncapsulatedDocument = pdfBuffer.buffer.slice(pdfBuffer.byteOffset, pdfBuffer.byteOffset + pdfBuffer.byteLength);

        // Use standard dictionary to ensure proper VRs
        const denaturalized = dcmjs.data.DicomMetaDictionary.denaturalizeDataset(dataset);
        const dicomDict = new dcmjs.data.DicomDict(meta);
        dicomDict.dict = denaturalized;

        const buffer = Buffer.from(dicomDict.write());

        return {
            buffer,
            sopInstanceUID,
            seriesInstanceUID
        };
    } catch (err) {
        console.error('💥 [dicomPdfService] wrapPdfToDicom failed:', err.message);
        throw err;
    }
}

/**
 * Wrap and send to PACS.
 */
async function generateAndSendDicomPdf(reportData, pdfBuffer, pacsServerId) {
    const { buffer, sopInstanceUID } = await wrapPdfToDicom(reportData, pdfBuffer);
    const tempDir = path.resolve(__dirname, '../tmp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    const filePath = path.join(tempDir, `PDF_${sopInstanceUID}.dcm`);
    fs.writeFileSync(filePath, buffer);

    const dimseService = require('./dimseService');
    await dimseService.sendCStore(filePath, pacsServerId);

    try { fs.unlinkSync(filePath); } catch (e) {}

    return sopInstanceUID;
}

module.exports = {
    wrapPdfToDicom,
    generateAndSendDicomPdf
};
