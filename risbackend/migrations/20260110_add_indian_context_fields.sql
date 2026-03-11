-- 20260110_add_indian_context_fields.sql

ALTER TABLE patients
ADD COLUMN IF NOT EXISTS aadhaar_number VARCHAR(12) UNIQUE,
ADD COLUMN IF NOT EXISTS abha_id VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS consent_artifact JSONB DEFAULT '{}';

-- Create indexes for faster lookup by IDs
CREATE INDEX IF NOT EXISTS idx_patients_aadhaar ON patients(aadhaar_number);
CREATE INDEX IF NOT EXISTS idx_patients_abha ON patients(abha_id);
