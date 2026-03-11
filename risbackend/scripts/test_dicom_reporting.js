/**
 * scripts/test_dicom_reporting.js
 * 
 * Verifies that the SR and PDF generation services work as expected.
 * Saves test files to 'tmp' for inspection.
 */

const srService = require('../services/srService');
const dicomPdfService = require('../services/dicomPdfService');
const fs = require('fs');
const path = require('path');

async function test() {
    console.log('🧪 Starting DICOM Reporting Test...');
    
    const mockData = {
        studyInstanceUID: '1.2.3.4.567.89.0',
        patientID: 'TEST_PATIENT_001',
        patientName: 'CITIZEN^JOE',
        accessionNumber: 'ACC123',
        modality: 'CT',
        reportTitle: 'BRAIN CT REPORT',
        observerName: 'Dr. Test'
    };
    
    const mockText = 'This is a test report finding. No significant abnormalities noted.';
    const mockPdf = Buffer.from('%PDF-1.4 Mock PDF Content');
    
    const tmpDir = path.resolve(__dirname, '../tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

    try {
        // 1. Test SR
        console.log('--- Testing SR Generation ---');
        const sr = await srService.generateSR(mockData, mockText);
        const srPath = path.join(tmpDir, 'test_sr.dcm');
        fs.writeFileSync(srPath, sr.buffer);
        console.log(`✅ SR generated: ${srPath} (${sr.buffer.length} bytes)`);
        console.log(`   SOPInstanceUID: ${sr.sopInstanceUID}`);

        // 2. Test DICOM PDF
        console.log('--- Testing DICOM PDF Generation ---');
        const pdf = await dicomPdfService.wrapPdfToDicom(mockData, mockPdf);
        const pdfPath = path.join(tmpDir, 'test_pdf.dcm');
        fs.writeFileSync(pdfPath, pdf.buffer);
        console.log(`✅ DICOM PDF generated: ${pdfPath} (${pdf.buffer.length} bytes)`);
        console.log(`   SOPInstanceUID: ${pdf.sopInstanceUID}`);

        console.log('\n🎯 DICOM services are healthy.');
        console.log('Next: Run migrations and test end-to-end via finalizeReport.');
        
    } catch (err) {
        console.error('❌ Test Failed:', err);
    }
}

test();
