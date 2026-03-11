-- migrations/20260309_add_triage_priority_to_studies.sql
-- Add AI Triage and Prioritization fields to the pacs_studies table

ALTER TABLE pacs_studies
ADD COLUMN IF NOT EXISTS urgency_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'NORMAL';

-- Create an index for faster sorting in the worklist
CREATE INDEX IF NOT EXISTS idx_pacs_studies_priority ON pacs_studies(urgency_score DESC, arrived_at DESC);
