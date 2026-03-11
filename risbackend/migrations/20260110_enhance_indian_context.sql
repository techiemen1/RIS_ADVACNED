-- Add Indian Context Enhancements
ALTER TABLE patients ADD COLUMN IF NOT EXISTS id_type VARCHAR(50) DEFAULT 'AADHAAR';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS id_number VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_provider VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS policy_type VARCHAR(50);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS policy_validity DATE;

-- Index for ID searches
CREATE INDEX IF NOT EXISTS idx_patients_id_number ON patients(id_number);
