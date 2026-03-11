const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_URL = 'http://localhost:5000/api';
// We need a valid token. Since we can't easily login via script without credentials hardcoded or reused, 
// let's assume we can hit the endpoint if we had a token, OR we mock it.
// Actually, earlier verifyToken checks header.
// I will create a test that assumes the server is running and we might need to bypass auth or use a clear method.
// For now, let's just inspect the DB directly to see if columns exist, 
// and try to insert a row using the model directly to bypass Auth middleware for this quick verification script.

const { pool } = require('../config/postgres');
const { createPatient } = require('../models/patientModel');
const { verifyPAN } = require('../services/verificationService');

async function testRegistration() {
    console.log("1. Testing PAN Verification Service...");
    const v1 = await verifyPAN('ABCDE1234F');
    const v2 = await verifyPAN('INVALID');
    console.log(`- Valid PAN: ${v1.valid}`);
    console.log(`- Invalid PAN: ${v2.valid} (${v2.message})`);

    console.log("\n2. Testing DB Insert of Enhanced Fields...");
    try {
        const patient = await createPatient({
            first_name: 'Test',
            last_name: 'Patient',
            dob: '1990-01-01',
            gender: 'Male',
            phone: '9999999999',
            email: 'test@example.com',
            address: 'Test Address',
            id_type: 'PAN',
            id_number: 'ABCDE1234F',
            insurance_provider: 'PM-JAY',
            policy_type: 'Government',
            policy_validity: '2027-12-31'
        });
        console.log(`- Patient Created ID: ${patient.id}`);
        console.log(`- ID Type: ${patient.id_type}`);
        console.log(`- Insurance: ${patient.insurance_provider}`);

        // Clean up
        await pool.query('DELETE FROM patients WHERE id = $1', [patient.id]);
        console.log("- Test Data Cleaned Up");
    } catch (err) {
        console.error("!- Insert Failed:", err);
    }
    process.exit(0);
}

testRegistration();
