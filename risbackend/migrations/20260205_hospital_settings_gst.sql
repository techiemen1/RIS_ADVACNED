-- Migration: Create and expand hospital_settings for GST compliance
CREATE TABLE IF NOT EXISTS hospital_settings (
    id SERIAL PRIMARY KEY,
    name TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    logo_path TEXT,
    footer_text TEXT,
    gstin VARCHAR(15),
    pan VARCHAR(10),
    state VARCHAR(50),
    bank_name TEXT,
    account_number TEXT,
    ifsc_code TEXT,
    branch_name TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for lookup
CREATE INDEX IF NOT EXISTS idx_hospital_settings_gstin ON hospital_settings(gstin);

-- Ensure default row
INSERT INTO hospital_settings (name)
SELECT 'iPACX DIAGNOSTICS'
WHERE NOT EXISTS (SELECT 1 FROM hospital_settings);
