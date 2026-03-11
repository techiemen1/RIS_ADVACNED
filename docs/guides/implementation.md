# RIS-iPACX: Implementation & Deployment Guide

This guide describes the steps required to deploy, configure, and maintain the RIS-iPACX ecosystem in a production clinical environment.

## 1. System Requirements
- **Server**: Node.js v18+, PostgreSQL v14+
- **DICOM Node**: Orthanc, dcm4chee, or any DICOM-compliant PACS server.
- **Connectivity**: Stable internet for AI features (OpenAI/Groq).

## 2. Environment Configuration
Create a `.env` file in the backend root:
```env
PORT=5000
DATABASE_URL=postgres://user:pass@localhost:5432/ris_db
JWT_SECRET=your_secure_random_string
OPENAI_API_KEY=sk-... (For Whisper/AI)
GROQ_API_KEY=gsk_... (For LLM Intelligence)
RAZORPAY_KEY_ID=rzp_test_... (For Payments)
RAZORPAY_KEY_SECRET=... (For Secure Verify)
SMTP_HOST=smtp.your-provider.com
SMTP_USER=...
SMTP_PASS=...
WHATSAPP_TOKEN=... (Meta Developer Portal)
WHATSAPP_PHONE_ID=...
RIS_AE_TITLE=iPACX_STORE (AET where PACS sends images)
RIS_AET=RIS_MWL (Local AET for requests)
TZ=Asia/Kolkata
```

## 3. Database Initialisation
Run the schema migrations found in `/risbackend/config/schema.sql` to set up tables including:
- `reports`, `secure_shares`
- `patient_payments` (For Phase 8 FinOps)
- `report_templates`

## 4. PACS Integration Flow
1. **DICOM C-FIND**: Configure the RIS node in your PACS as a Query/Retrieve SCP.
2. **MWL (Modality Worklist)**: The system automatically generates Worklist items for pending orders.
3. **Key Images**: Ensure the PACS node permits HTTP/S retrieval for the frontend web-viewer.

## 5. Production Hardening
- **SSL/TLS**: Always serve the frontend and backend behind a reverse proxy (Nginx) with Let's Encrypt.
- **Backups**: Implement daily PG_DUMP tasks for clinical data.
- **Audit Logging**: Logs are persisted to the database; ensure regular rotation of non-PHI logs to manage storage.

---
*Documentation Version: 1.0 (Implementation Guide)*
