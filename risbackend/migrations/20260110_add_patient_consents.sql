-- 20260110_add_patient_consents.sql

CREATE TABLE IF NOT EXISTS patient_consents (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    consent_type VARCHAR(50) NOT NULL, -- 'GENERAL', 'CONTRAST', 'ANESTHESIA', 'DATA_SHARING'
    status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'SIGNED', 'REVOKED'
    signed_by VARCHAR(100),
    signed_at TIMESTAMP,
    ip_address VARCHAR(45),
    consent_text TEXT, -- Snapshot of what was agreed to
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_consents_patient_id ON patient_consents(patient_id);
CREATE INDEX IF NOT EXISTS idx_consents_status ON patient_consents(status);
