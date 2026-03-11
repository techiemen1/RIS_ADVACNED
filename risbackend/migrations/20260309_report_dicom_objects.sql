-- Migration: Report DICOM Objects Tracking
-- Description: Table to track generated DICOM SR and Encapsulated PDF objects sent to PACS.

CREATE TABLE IF NOT EXISTS report_dicom_objects (
    id SERIAL PRIMARY KEY,
    report_id INTEGER NOT NULL,
    study_instance_uid VARCHAR(255) NOT NULL,
    series_instance_uid VARCHAR(255) NOT NULL,
    sop_instance_uid VARCHAR(255) UNIQUE NOT NULL,
    object_type VARCHAR(20) NOT NULL, -- 'SR' or 'PDF'
    pacs_server_id INTEGER REFERENCES pacs_servers(id),
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    pushed_at TIMESTAMP
);

-- Index for fast lookup by study
CREATE INDEX idx_report_dicom_study ON report_dicom_objects(study_instance_uid);
