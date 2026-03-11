# Walkthrough: Phase 4 — Patient Engagement Portal

## 1. Accomplishments
Phase 4 focused on providing patients with secure, direct access to their health records without requiring a full user account.

### Secure QR Link Infrastructure
- **Ephemeral Access Tokens**: Developed a system to generate unique, high-entropy tokens for report access via the `patient_access_tokens` table.
- **OTP Protection**: Implemented a mandatory One-Time Password (OTP) layer to verify patient identity before displaying clinical findings.
- **Automated Expiry**: Tokens are configured with a 7-day TTL (Time-To-Live), ensuring health data remains accessible only for a limited medical window.

### Backend Portal Integration
- **Secure Retrieval Service**: Created a specialized controller (`patientPortalController.js`) that retrieves clinical findings while filtering out sensitive administrative metadata.
- **API Endpoints**: Established a public gateway specifically for patient portal traffic, separate from the primary hospital API.

## 2. Technical Evidence
- **Database Schema**: [20260127_create_patient_tokens.sql](file:///home/jags/RIS_ADVANCED/risbackend/migrations/20260127_create_patient_tokens.sql)
- **Portal Controller**: [patientPortalController.js](file:///home/jags/RIS_ADVANCED/risbackend/controllers/patientPortalController.js)
- **Portal Routes**: [patientPortalRoutes.js](file:///home/jags/RIS_ADVANCED/risbackend/routes/patientPortalRoutes.js)

## 3. Usage (Internal API)
**Staff Endpoint (Generate Link)**:
`POST /api/patient/portal/generate-link`
Payload: `{ "reportId": 123, "patientId": 456 }`

**Patient Endpoint (View Report)**:
`GET /api/patient/portal/view/<token>?otp=123456`

---
*Date: 2026-01-27*
