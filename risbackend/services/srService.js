/**
 * services/srService.js
 * 
 * Generates DICOM Structured Reports (SR) from RIS report content.
 * SOP Class: Basic Text SR (1.2.840.10008.5.1.4.1.1.88.11)
 */

const dcmjs = require('dcmjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');

/**
 * Generate a DICOM SR file buffer.
 * 
 * @param {Object} reportData - Report and Patient metadata
 * @param {string} reportText - Plain text of the report
 * @returns {Object} { buffer, sopInstanceUID, seriesInstanceUID }
 */
async function generateSR(reportData, reportText) {
    try {
        const {
            studyInstanceUID,
            patientID,
            patientName,
            accessionNumber,
            modality,
            observerName
        } = reportData;

        // 1. Generate new UIDs for this object
        const uidPrefix = '1.2.826.0.1.3680043.2.1125.'; 
        const seriesInstanceUID = uidPrefix + uuidv4().replace(/-/g, '.').substring(0, 30);
        const sopInstanceUID = uidPrefix + uuidv4().replace(/-/g, '.').substring(0, 30);

        // 2. Build the Dataset (Senior Architect Standard)
        const dataset = {
            _vrMap: {},
            _meta: {
                FileMetaInformationGroupLength: 0,
                FileMetaInformationVersion: new Uint8Array([0, 1]).buffer,
                ImplementationClassUID: "1.2.826.0.1.3680043.2.1143.107.104.103.115.2.1.0",
                MediaStorageSOPClassUID: "1.2.840.10008.5.1.4.1.1.88.11", // Basic Text SR
                MediaStorageSOPInstanceUID: sopInstanceUID,
                TransferSyntaxUID: "1.2.840.10008.1.2.1", // Explicit VR Little Endian
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
            ReferringPhysicianName: '',

            // SR Document Series Module
            Modality: 'SR',
            SeriesInstanceUID: seriesInstanceUID,
            SeriesNumber: "1001", // Elevated series number for reports

            // General Equipment Module
            Manufacturer: "iPacx RIS",
            StationName: "AI_REPORTING_NODE",
            ManufacturerModelName: "iPacx-Gold-v2",

            // SR Document General Module
            InstanceNumber: "1",
            SOPClassUID: "1.2.840.10008.5.1.4.1.1.88.11",
            SOPInstanceUID: sopInstanceUID,
            ContentDate: dayjs().format('YYYYMMDD'),
            ContentTime: dayjs().format('HHmmss'),
            
            // Verification Module
            VerificationFlag: "VERIFIED", // Sent after finalize, so it is verified
            CompletionFlag: "COMPLETE",

            // Document Content Macro (Basic Text SR Structure)
            ValueType: "CONTAINER",
            ConceptNameCodeSequence: [{
                CodeValue: "11528-7",
                CodingSchemeDesignator: "LN",
                CodeMeaning: "Radiology Report"
            }],
            ContinuityOfContent: "SEPARATE",

            // Content Sequence: Findings + Impression + Observer
            ContentSequence: [
                {
                    RelationshipType: "CONTAINS",
                    ValueType: "TEXT",
                    ConceptNameCodeSequence: [{
                        CodeValue: "121070",
                        CodingSchemeDesignator: "DCM",
                        CodeMeaning: "Findings"
                    }],
                    TextValue: reportText
                },
                {
                    RelationshipType: "CONTAINS",
                    ValueType: "PNAME",
                    ConceptNameCodeSequence: [{
                        CodeValue: "121008",
                        CodingSchemeDesignator: "DCM",
                        CodeMeaning: "Person Observer Name"
                    }],
                    PersonName: observerName || 'Radiologist'
                }
            ]
        };

        // 3. Convert to buffer using dcmjs
        const meta = dataset._meta;
        delete dataset._meta;
        delete dataset._vrMap;

        // Use standard dictionary to ensure proper VRs (avoids 'UN' VRs)
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
        console.error('💥 [srService] generateSR failed:', err.message);
        throw err;
    }
}

/**
 * Save SR to temp file and send to PACS.
 */
async function saveAndSendSR(reportData, reportText, pacsServerId) {
    const { buffer, sopInstanceUID } = await generateSR(reportData, reportText);
    const tempDir = path.resolve(__dirname, '../tmp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
    
    const filePath = path.join(tempDir, `SR_${sopInstanceUID}.dcm`);
    fs.writeFileSync(filePath, buffer);
    
    const dimseService = require('./dimseService');
    await dimseService.sendCStore(filePath, pacsServerId);
    
    // Clean up
    try { fs.unlinkSync(filePath); } catch (e) {}
    
    return sopInstanceUID;
}

module.exports = {
    generateSR,
    saveAndSendSR
};
