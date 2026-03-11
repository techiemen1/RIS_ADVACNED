-- Migration: Add gender column to report_templates
ALTER TABLE report_templates
ADD COLUMN IF NOT EXISTS gender VARCHAR(10) DEFAULT NULL;

-- Index for faster filtering
CREATE INDEX IF NOT EXISTS idx_report_templates_gender ON report_templates(gender);
