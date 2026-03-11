const dcmjs = require('dcmjs');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { pool } = require('../config/postgres');

// PACS URLs
const ORTHANC_URL = process.env.ORTHANC_URL || 'http://localhost:8042';
const DCM4CHEE_URL = process.env.DCM4CHEE_URL || 'http://localhost:8080';
const TARGET_PACS_URL = process.env.TARGET_PACS_URL || `${ORTHANC_URL}/instances`; // Default to Orthanc import

/**
 * Wraps a PDF buffer into a DICOM Encapsulated PDF IOD
 */
const createDicomPdf = (pdfBuffer, metadata) => {
    const {
        PatientName, PatientID, PatientSex, PatientBirthDate,
        AccessionNumber, StudyInstanceUID, SeriesInstanceUID,
        StudyDate, StudyTime, Modality, ReferringPhysicianName
    } = metadata;

    const dataset = {
        _vrMap: { PixelData: "OB" },

        // Patient Module
        PatientName: { "Alphabetic": PatientName || "UNKNOWN" },
        PatientID: PatientID || "UNKNOWN",
        PatientSex: PatientSex || "O",
        PatientBirthDate: PatientBirthDate || "",

        // Study Module
        StudyInstanceUID: StudyInstanceUID || dcmjs.data.DicomMetaDictionary.uid(),
        StudyDate: StudyDate || new Date().toISOString().slice(0, 10).replace(/-/g, ""),
        StudyTime: StudyTime || new Date().toISOString().slice(11, 16).replace(/:/g, "") + "00",
        AccessionNumber: AccessionNumber || "",
        ReferringPhysicianName: { "Alphabetic": ReferringPhysicianName || "" },
        StudyID: AccessionNumber || "1",

        // Series Module
        SeriesInstanceUID: SeriesInstanceUID || dcmjs.data.DicomMetaDictionary.uid(),
        SeriesNumber: 999, // Standard for reports
        Modality: "DOC", // Document Class

        // Encapsulated Document Module
        SOPClassUID: "1.2.840.10008.5.1.4.1.1.104.1", // Encapsulated PDF Storage
        SOPInstanceUID: dcmjs.data.DicomMetaDictionary.uid(),
        InstanceNumber: 1,
        BurnedInAnnotation: "YES",
        DocumentTitle: { "Alphabetic": "RADIOLOGY REPORT" },
        MIMETypeOfEncapsulatedDocument: "application/pdf",
        EncapsulatedDocument: pdfBuffer // Raw buffer
    };

    // Convert to DICOM Buffer (using dcmjs DicomDict)
    // Note: dcmjs native object creation is complex, usually we use dataset directly if library supports it.
    // dcmjs.data.datasetToDict is the way.

    const meta = {
        FileMetaInformationVersion: new Uint8Array([0, 1]),
        MediaStorageSOPClassUID: dataset.SOPClassUID,
        MediaStorageSOPInstanceUID: dataset.SOPInstanceUID,
        TransferSyntaxUID: "1.2.840.10008.1.2.1", // Explicit VR Little Endian
        ImplementationClassUID: "1.2.276.0.7230010.3.0.3.6.4", // dcmjs uid
    };

    const denaturalized = dcmjs.data.DicomMetaDictionary.denaturalizeDataset(dataset);
    const dicomDict = new dcmjs.data.DicomDict(meta);
    dicomDict.dict = denaturalized;

    return Buffer.from(dicomDict.write());
};

exports.exportReportToPacs = async (req, res) => {
    try {
        if (!req.files || !req.files.pdf) {
            return res.status(400).json({ success: false, message: "No PDF file uploaded" });
        }

        const pdfFile = req.files.pdf;
        const metadata = JSON.parse(req.body.metadata || "{}");

        console.log(`[DICOM EXPORT] Processing report for Acc: ${metadata.AccessionNumber}`);

        // Generate DICOM Buffer
        const dicomBuffer = createDicomPdf(pdfFile.data, metadata);

        // Push to PACS (STOW-RS or simple POST import)
        // Orthanc /instances takes raw DICOM file
        // DCM4CHEE STOW-RS requires multipart. 
        // We will attempt Orthanc /instances first as it's simplest.

        // Determine Target URL based on env or default
        const uploadUrl = TARGET_PACS_URL;

        console.log(`[DICOM EXPORT] Pushing ${dicomBuffer.length} bytes to ${uploadUrl}`);

        await axios.post(uploadUrl, dicomBuffer, {
            headers: {
                'Content-Type': 'application/dicom'
            },
            maxBodyLength: Infinity,
            maxContentLength: Infinity
        });

        console.log("[DICOM EXPORT] Success");
        res.json({ success: true, message: "Report successfully exported to PACS" });

    } catch (error) {
        console.error("[DICOM EXPORT ERROR]", error);
        res.status(500).json({ success: false, message: "Failed to export to PACS", error: error.message });
    }
};
