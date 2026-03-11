-- 20260109_enhance_patient_management.sql

-- Add clinical alert info and portal access to patients
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS clinical_info JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS portal_access BOOLEAN DEFAULT FALSE;

-- Add status tracking columns to schedules
ALTER TABLE schedules
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, checked_in, in_progress, completed
ADD COLUMN IF NOT EXISTS check_in_time TIMESTAMP,
ADD COLUMN IF NOT EXISTS completion_time TIMESTAMP;

-- Create index for faster status lookup
CREATE INDEX IF NOT EXISTS idx_schedules_status ON schedules(status);
