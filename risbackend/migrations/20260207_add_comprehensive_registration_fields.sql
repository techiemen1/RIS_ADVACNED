-- Migration: Add Comprehensive Patient Registration Fields (Gold Standard / ABHA / FHIR)
-- Date: 2026-02-07

-- 1. Workflow & Classification
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_type VARCHAR(20) DEFAULT 'OPD'; -- OPD, IPD, EMERGENCY
ALTER TABLE patients ADD COLUMN IF NOT EXISTS billing_category VARCHAR(50) DEFAULT 'Self-Pay'; -- Cash, Insurance, PMJAY, CGHS
ALTER TABLE patients ADD COLUMN IF NOT EXISTS admission_date TIMESTAMP; 
ALTER TABLE patients ADD COLUMN IF NOT EXISTS discharge_date TIMESTAMP;

-- 2. Identifiers (ABHA & FHIR Alignment)
ALTER TABLE patients ADD COLUMN IF NOT EXISTS abha_number VARCHAR(20); -- XX-XX-XX-XX
ALTER TABLE patients ADD COLUMN IF NOT EXISTS abha_address VARCHAR(100); -- user@abdm
ALTER TABLE patients ADD COLUMN IF NOT EXISTS identifiers JSONB DEFAULT '[]'::jsonb; -- Store other IDs: [{system: 'PAN', value: '...'}, {system: 'Passport', value: '...'}]

-- 3. Indian Context Demographics
ALTER TABLE patients ADD COLUMN IF NOT EXISTS relationship_type VARCHAR(10); -- S/O, D/O, W/O, H/O
ALTER TABLE patients ADD COLUMN IF NOT EXISTS relationship_name VARCHAR(100); 
ALTER TABLE patients ADD COLUMN IF NOT EXISTS marital_status VARCHAR(20);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS occupation VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS nationality VARCHAR(50) DEFAULT 'Indian';
-- Note: preferred_language already exists

-- 4. Emergency Contact
ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact_relation VARCHAR(50); -- e.g. Spouse, Parent

-- 5. Clinical Profile (Registration Level)
ALTER TABLE patients ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS height_cm NUMERIC(5,2);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(5,2);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS allergies TEXT; -- Simple text or JSON
ALTER TABLE patients ADD COLUMN IF NOT EXISTS current_medications TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS medical_history TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS pregnancy_status VARCHAR(20) DEFAULT 'Not Applicable'; -- Yes, No, Unknown, N/A
ALTER TABLE patients ADD COLUMN IF NOT EXISTS provisional_diagnosis TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS surgeries TEXT;

-- Indexes for robust search
CREATE INDEX IF NOT EXISTS idx_patients_abha_number ON patients(abha_number);
CREATE INDEX IF NOT EXISTS idx_patients_patient_type ON patients(patient_type);
CREATE INDEX IF NOT EXISTS idx_patients_phone_name ON patients(phone, first_name);
