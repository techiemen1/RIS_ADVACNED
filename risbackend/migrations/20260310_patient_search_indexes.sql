-- risbackend/migrations/20260310_patient_search_indexes.sql

-- Exact match indexes
CREATE INDEX IF NOT EXISTS idx_patients_mrn ON patients (mrn);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients (phone);
CREATE INDEX IF NOT EXISTS idx_patients_abha ON patients (abha_number);
CREATE INDEX IF NOT EXISTS idx_patients_id_number ON patients (id_number);
CREATE INDEX IF NOT EXISTS idx_patients_dob ON patients (dob);

-- Fuzzy name search (B-tree for prefix matching, or GIN if pg_trgm is available)
-- For a safe baseline without extension assumptions:
CREATE INDEX IF NOT EXISTS idx_patients_names ON patients (first_name, last_name);

-- GIN index for full fuzzy search (Uncomment if pg_trgm is enabled)
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX IF NOT EXISTS idx_patients_name_trgm ON patients USING gin (name gin_trgm_ops);
