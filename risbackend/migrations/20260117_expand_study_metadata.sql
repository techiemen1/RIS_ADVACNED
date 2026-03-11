-- Migration: Add missing columns to study_metadata for manual overrides
ALTER TABLE study_metadata ADD COLUMN IF NOT EXISTS patient_sex TEXT;
ALTER TABLE study_metadata ADD COLUMN IF NOT EXISTS patient_age TEXT;
ALTER TABLE study_metadata ADD COLUMN IF NOT EXISTS referring_physician TEXT;
ALTER TABLE study_metadata ADD COLUMN IF NOT EXISTS body_part TEXT;
