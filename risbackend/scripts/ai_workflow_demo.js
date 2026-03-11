const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../config/postgres');
const patientService = require('../services/patientService');
const orderService = require('../services/orderService');
const { processStudyArrival } = require('../services/studyArrivalService');

async function runDemo() {
    console.log('🚀 Starting RIS Workflow Demo...');

    try {
        // 1. Patient Registration
        console.log('\n--- STEP 1: Patient Registration ---');
        const patientData = {
            first_name: 'John',
            last_name: 'Doe',
            dob: '1985-05-15',
            gender: 'Male',
            phone: '9988776655',
            id_type: 'AADHAAR',
            id_number: '1234-5678-9012'
        };
        const p = await patientService.registerPatient(patientData);
        console.log(`✅ Patient Created: ${p.first_name} ${p.last_name}`);
        console.log(`🆔 MRN Assigned: ${p.mrn}`); // Should be IPX100001

        // 2. Imaging Order Creation
        console.log('\n--- STEP 2: Creating Imaging Order ---');
        const orderData = {
            patient_id: p.id,
            modality: 'CT',
            procedure_code: 'CTB01',
            procedure_description: 'CT Brain Plain',
            priority: 'URGENT'
        };
        const o = await orderService.createOrder(orderData);
        console.log(`✅ Order Created for ${o.modality}`);
        console.log(`🏷️  Accession Number: ${o.accession_number}`); // Should be ACC100001
        console.log(`✨ Status: ${o.status}`);

        // 3. Simulating Study Arrival (Matching by Accession)
        console.log('\n--- STEP 3: Simulating Study Arrival (Matching) ---');
        const mockOrthancPayload = {
            ID: 'orthanc-demo-id-123',
            Tags: {
                StudyInstanceUID: `1.2.840.${Date.now()}`,
                PatientID: p.mrn,
                AccessionNumber: o.accession_number,
                PatientName: `${p.last_name}^${p.first_name}`,
                StudyDate: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
                Modality: 'CT',
                StudyDescription: 'CT Brain Plain'
            }
        };
        
        const result = await processStudyArrival(mockOrthancPayload);
        console.log(`📥 Study Arrived Event Triggered`);
        console.log(`✅ Match Successful? ${result.matched ? 'YES' : 'NO'}`);
        console.log(`🔗 Matched By: ${result.matchedBy}`);
        console.log(`🧑‍⚕️ Assigned Radiologist: ${result.radiologist.name || 'System Auto'}`);
        console.log(`🚀 AI Triage Priority: ${result.pacsStudy.priority}`);
        console.log(`🔥 AI Triage Score: ${result.pacsStudy.urgency_score}`);

        // 4. Verification Check in DB
        const finalOrder = await pool.query('SELECT status FROM orders WHERE id = $1', [o.id]);
        console.log(`\n--- FINAL VERIFICATION ---`);
        console.log(`✅ RIS Order Status updated to: ${finalOrder.rows[0].status}`); // Should be ARRIVED

        console.log('\n🏁 Workflow Demo Complete!');
    } catch (e) {
        console.error('❌ Demo failed:', e);
    } finally {
        process.exit();
    }
}

runDemo();
