-- Migration: Add Medical Record Number (MRN) to patients
ALTER TABLE patients 
    ADD COLUMN IF NOT EXISTS mrn VARCHAR(50) UNIQUE;

-- Index for fast lookup by MRN
CREATE INDEX IF NOT EXISTS idx_patients_mrn ON patients(mrn);
