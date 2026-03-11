-- migrations/20260127_add_ai_findings.sql

ALTER TABLE pacs_studies 
ADD COLUMN IF NOT EXISTS ai_findings TEXT,
ADD COLUMN IF NOT EXISTS ai_status VARCHAR(50) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS is_critical BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ai_metadata JSONB;

-- Index for critical result searching
CREATE INDEX IF NOT EXISTS idx_pacs_studies_critical ON pacs_studies(is_critical) WHERE is_critical = TRUE;
