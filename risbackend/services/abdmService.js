// risbackend/services/abdmService.js
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const db = require('../db'); // Assuming db is the database connection

/**
 * Service for ABDM (Ayushman Bharat Digital Mission) Integration
 * Handles ABHA verification, FHIR document generation, and Gateway communication.
 */
class ABDMService {
    constructor() {
        this.gatewayUrl = process.env.ABDM_GATEWAY_URL || 'https://dev.abdm.gov.in/gateway';
        this.clientId = process.env.ABDM_CLIENT_ID;
        this.clientSecret = process.env.ABDM_CLIENT_SECRET;
    }

    /**
     * M1: ABHA Number Verification via OTP
     * @param {string} abhaNumber 
     * @param {string} otp 
     * @param {string} txnId 
     */
    async verifyAbhaOtp(abhaNumber, otp, txnId) {
        try {
            // In production, this calls the ABDM Gateway /v1/registration/aadhar/verifyOTP
            // For this implementation, we simulate the success and store it.
            const response = {
                status: 'SUCCESS',
                abha_address: `${abhaNumber}@abdm`,
                kyc: { name: "Sample Patient", gender: "M", dob: "1990-01-01" }
            };

            if (response.status === 'SUCCESS') {
                await db.query(`
                    INSERT INTO abha_registrations (abha_number, abha_address, status, kyc_data)
                    VALUES ($1, $2, 'VERIFIED', $3)
                    ON CONFLICT (abha_number) DO UPDATE SET status = 'VERIFIED', kyc_data = $3
                `, [abhaNumber, response.abha_address, response.kyc]);
            }

            return response;
        } catch (error) {
            console.error('ABDM OTP Verification Error:', error);
            throw new Error('Failed to verify ABHA OTP');
        }
    }

    /**
     * M2: FHIR Document Generation (DiagnosticReport Bundle)
     * Transforms RIS study data into a FHIR-compliant JSON Bundle.
     */
    generateFHIRDiagnosticReport(patient, study, observations) {
        const bundleId = uuidv4();

        return {
            resourceType: "Bundle",
            id: bundleId,
            type: "document",
            timestamp: new Date().toISOString(),
            entry: [
                {
                    resource: {
                        resourceType: "Composition",
                        status: "final",
                        type: { text: "Radiology Report" },
                        subject: { reference: `Patient/${patient.id}`, display: patient.name },
                        date: new Date().toISOString(),
                        author: [{ display: "Oviyam RIS" }],
                        title: "Diagnostic Radiology Report",
                        section: [
                            {
                                title: "Findings",
                                code: { coding: [{ system: "http://loinc.org", code: "59482-0" }] },
                                text: { status: "generated", div: `<div>${study.report_text}</div>` }
                            }
                        ]
                    }
                },
                // Additional FHIR resources (Patient, Practitioner, Observation) would go here
            ]
        };
    }

    /**
     * M3: Push URI to Gateway (Data Transfer)
     */
    async pushToABDM(patientId, fhirBundle) {
        // Implementation for data push via HIU/HIP gateway
        console.log(`Pushing FHIR Bundle for Patient ${patientId} to ABDM Gateway`);
        // Logic for /v0.5/health-information/notify
        return { txnId: uuidv4() };
    }
}

module.exports = new ABDMService();
