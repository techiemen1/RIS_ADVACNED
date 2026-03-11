-- migrations/20260127_enhance_worklist_ai.sql

ALTER TABLE worklist 
ADD COLUMN IF NOT EXISTS ai_status VARCHAR(50) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS is_critical BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ai_findings TEXT;

CREATE INDEX IF NOT EXISTS idx_worklist_critical ON worklist(is_critical) WHERE is_critical = TRUE;
