-- migrations/20260127_create_pacs_studies.sql

CREATE TABLE IF NOT EXISTS pacs_studies (
    id SERIAL PRIMARY KEY,
    study_instance_uid VARCHAR(255) UNIQUE NOT NULL,
    patient_name VARCHAR(255),
    patient_id VARCHAR(100),
    modality VARCHAR(50),
    accession_number VARCHAR(100),
    study_date VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pacs_studies_uid ON pacs_studies(study_instance_uid);
CREATE INDEX IF NOT EXISTS idx_pacs_studies_patient ON pacs_studies(patient_id);
CREATE INDEX IF NOT EXISTS idx_pacs_studies_accession ON pacs_studies(accession_number);
