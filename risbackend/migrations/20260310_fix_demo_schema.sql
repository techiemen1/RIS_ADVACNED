-- Migration: 20260310_fix_demo_schema.sql
-- Fixes missing sequences and columns for demo scripts

-- 1. Create sequences expected by the code
CREATE SEQUENCE IF NOT EXISTS patient_mrn_seq START WITH 100001;
CREATE SEQUENCE IF NOT EXISTS accession_seq START WITH 100001;

-- 2. Add core identity and Indian context fields
ALTER TABLE patients ADD COLUMN IF NOT EXISTS id_type VARCHAR(50) DEFAULT 'AADHAAR';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS id_number VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'en';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS abha_number VARCHAR(20);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS abha_address VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS abha_id VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS identifiers JSONB DEFAULT '[]'::jsonb;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS aadhaar_number VARCHAR(20);

-- 3. Relationship and Demographic fields
ALTER TABLE patients ADD COLUMN IF NOT EXISTS relationship_type VARCHAR(50);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS relationship_name VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS marital_status VARCHAR(20);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS occupation VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS nationality VARCHAR(50) DEFAULT 'Indian';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact_relation VARCHAR(50);

-- 4. Clinical and Vitals
ALTER TABLE patients ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS height_cm NUMERIC(5,2);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(5,2);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS allergies TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS current_medications TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS medical_history TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS pregnancy_status VARCHAR(20);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS provisional_diagnosis TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS surgeries TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS lmp_date DATE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS creatinine_level NUMERIC(5,2);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS contrast_safety_flag BOOLEAN DEFAULT TRUE;

-- 5. Consents and Flags
ALTER TABLE patients ADD COLUMN IF NOT EXISTS consent_artifact JSONB DEFAULT '{}';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS consent_image_sharing BOOLEAN DEFAULT FALSE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS consent_research_ai BOOLEAN DEFAULT FALSE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS consent_telemedicine BOOLEAN DEFAULT FALSE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS data_privacy_accepted BOOLEAN DEFAULT TRUE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS biometric_flag BOOLEAN DEFAULT FALSE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS digital_signature TEXT;

-- 6. Administrative / Visit info
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_type VARCHAR(20) DEFAULT 'OPD';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS billing_category VARCHAR(50) DEFAULT 'Self-Pay';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS admission_date TIMESTAMP;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS discharge_date TIMESTAMP;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS registration_channel VARCHAR(20) DEFAULT 'DESK';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS registered_by_device VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS visit_type VARCHAR(20) DEFAULT 'NEW';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS attending_physician VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS ward_room_bed VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS voter_id VARCHAR(50);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_provider VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS policy_type VARCHAR(50);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS policy_validity DATE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS portal_access BOOLEAN DEFAULT FALSE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS clinical_info JSONB DEFAULT '{}';

-- 7. Orders table fixes
ALTER TABLE orders ADD COLUMN IF NOT EXISTS priority VARCHAR(100) DEFAULT 'ROUTINE';
ALTER TABLE orders ALTER COLUMN priority TYPE VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS referral_source VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_tele_radiology BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pacs_study_id INTEGER;

-- 8. Arrival Pipeline Tables (pacs_studies, modality_assignments)
CREATE TABLE IF NOT EXISTS pacs_studies (
  id                   SERIAL       PRIMARY KEY,
  study_instance_uid   VARCHAR(128) UNIQUE NOT NULL
);

-- Ensure all columns exist in pacs_studies with sufficient length
ALTER TABLE pacs_studies ADD COLUMN IF NOT EXISTS patient_id_dicom     VARCHAR(100);
ALTER TABLE pacs_studies ALTER COLUMN patient_id_dicom TYPE VARCHAR(100);
ALTER TABLE pacs_studies ADD COLUMN IF NOT EXISTS accession_number     VARCHAR(100);
ALTER TABLE pacs_studies ALTER COLUMN accession_number TYPE VARCHAR(100);
ALTER TABLE pacs_studies ADD COLUMN IF NOT EXISTS modality             VARCHAR(100);
ALTER TABLE pacs_studies ALTER COLUMN modality TYPE VARCHAR(100);
ALTER TABLE pacs_studies ADD COLUMN IF NOT EXISTS patient_name         VARCHAR(255);
ALTER TABLE pacs_studies ADD COLUMN IF NOT EXISTS study_date           VARCHAR(100);
ALTER TABLE pacs_studies ALTER COLUMN study_date TYPE VARCHAR(100);
ALTER TABLE pacs_studies ADD COLUMN IF NOT EXISTS study_description    TEXT;
ALTER TABLE pacs_studies ADD COLUMN IF NOT EXISTS series_count         INTEGER DEFAULT 0;
ALTER TABLE pacs_studies ADD COLUMN IF NOT EXISTS instance_count       INTEGER DEFAULT 0;
ALTER TABLE pacs_studies ADD COLUMN IF NOT EXISTS orthanc_study_id     VARCHAR(255);
ALTER TABLE pacs_studies ALTER COLUMN orthanc_study_id TYPE VARCHAR(255);
ALTER TABLE pacs_studies ADD COLUMN IF NOT EXISTS order_id             INTEGER REFERENCES orders(id) ON DELETE SET NULL;
ALTER TABLE pacs_studies ADD COLUMN IF NOT EXISTS assigned_radiologist INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE pacs_studies ADD COLUMN IF NOT EXISTS arrival_status       VARCHAR(100) DEFAULT 'ARRIVED';
ALTER TABLE pacs_studies ALTER COLUMN arrival_status TYPE VARCHAR(100);
ALTER TABLE pacs_studies ADD COLUMN IF NOT EXISTS is_unscheduled       BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE pacs_studies ADD COLUMN IF NOT EXISTS raw_payload          JSONB;
ALTER TABLE pacs_studies ADD COLUMN IF NOT EXISTS arrived_at           TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE pacs_studies ADD COLUMN IF NOT EXISTS updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE pacs_studies ADD COLUMN IF NOT EXISTS urgency_score        INTEGER DEFAULT 0;
ALTER TABLE pacs_studies ADD COLUMN IF NOT EXISTS priority             VARCHAR(100) DEFAULT 'NORMAL';
ALTER TABLE pacs_studies ALTER COLUMN priority TYPE VARCHAR(100);

CREATE TABLE IF NOT EXISTS modality_assignments (
  id           SERIAL  PRIMARY KEY,
  modality     VARCHAR(32) NOT NULL UNIQUE,
  user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Popular modality assignments table
INSERT INTO modality_assignments (modality, user_id)
VALUES ('CT', NULL), ('MR', NULL), ('CR', NULL), ('DR', NULL), ('DX', NULL), ('US', NULL)
ON CONFLICT (modality) DO NOTHING;

-- Study Metadata Cache Table
CREATE TABLE IF NOT EXISTS study_metadata (
    id SERIAL PRIMARY KEY,
    study_instance_uid VARCHAR(255) UNIQUE NOT NULL,
    patient_name VARCHAR(255),
    patient_id VARCHAR(100),
    modality VARCHAR(50),
    accession_number VARCHAR(100),
    study_date VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100),
    action VARCHAR(100),
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Final sequence checks
SELECT setval('patient_mrn_seq', COALESCE((SELECT MAX(CAST(SUBSTRING(mrn FROM 4) AS INTEGER)) FROM patients WHERE mrn LIKE 'IPX%'), 100001), true);
SELECT setval('accession_seq', COALESCE((SELECT MAX(CAST(SUBSTRING(accession_number FROM 4) AS INTEGER)) FROM orders WHERE accession_number LIKE 'ACC%'), 100001), true);

-- 10. Modalities table fixes
ALTER TABLE modalities ADD COLUMN IF NOT EXISTS color VARCHAR(50) DEFAULT '#3b82f6';

-- Seed sample modalities if the table is empty (to help user see the flow)
INSERT INTO modalities (name, ae_title, ip_address, port, description, color)
SELECT 'CT Scanner 1', 'CT_SCANNER_1', '127.0.0.1', 104, 'Sample CT Modality', '#ef4444'
WHERE NOT EXISTS (SELECT 1 FROM modalities WHERE ae_title = 'CT_SCANNER_1');

INSERT INTO modalities (name, ae_title, ip_address, port, description, color)
SELECT 'MRI 1.5T', 'MRI_15T', '127.0.0.1', 104, 'Sample MRI Modality', '#8b5cf6'
WHERE NOT EXISTS (SELECT 1 FROM modalities WHERE ae_title = 'MRI_15T');
