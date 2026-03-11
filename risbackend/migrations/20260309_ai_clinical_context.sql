-- 20260309_ai_clinical_context.sql
CREATE TABLE IF NOT EXISTS ai_clinical_context (
    id SERIAL PRIMARY KEY,
    study_instance_uid VARCHAR(255) NOT NULL UNIQUE,
    patient_id VARCHAR(255),
    modality VARCHAR(50),
    body_part VARCHAR(100),
    suggested_findings TEXT,
    comparison_hints TEXT,
    abnormality_alerts TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
