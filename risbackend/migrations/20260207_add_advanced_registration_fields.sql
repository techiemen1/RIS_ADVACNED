-- Migration: Add Advanced Patient Registration Fields (Visit, Clinical, Audit, Signature)
-- Date: 2026-02-07

-- 1. Identity & Audit
ALTER TABLE patients ADD COLUMN IF NOT EXISTS voter_id VARCHAR(20);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS biometric_flag BOOLEAN DEFAULT FALSE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS registration_channel VARCHAR(20) DEFAULT 'DESK'; -- KIOSK, DESK, MOBILE
ALTER TABLE patients ADD COLUMN IF NOT EXISTS registered_by_device VARCHAR(50);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 2. Visit Details
ALTER TABLE patients ADD COLUMN IF NOT EXISTS visit_type VARCHAR(20) DEFAULT 'NEW'; -- NEW, FOLLOW_UP
ALTER TABLE patients ADD COLUMN IF NOT EXISTS department VARCHAR(50);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS attending_physician VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS ward_room_bed JSONB; -- { "ward": "A", "room": "101", "bed": "1" }

-- 3. Clinical Context (Advanced)
ALTER TABLE patients ADD COLUMN IF NOT EXISTS lmp_date DATE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS creatinine_level NUMERIC(5,2);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS contrast_safety_flag BOOLEAN DEFAULT TRUE;

-- 4. Consent & Legal
ALTER TABLE patients ADD COLUMN IF NOT EXISTS consent_image_sharing BOOLEAN DEFAULT FALSE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS consent_research_ai BOOLEAN DEFAULT FALSE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS consent_telemedicine BOOLEAN DEFAULT FALSE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS data_privacy_accepted BOOLEAN DEFAULT TRUE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS digital_signature TEXT; -- Base64 usually

-- Indexes
CREATE INDEX IF NOT EXISTS idx_patients_visit_type ON patients(visit_type);
CREATE INDEX IF NOT EXISTS idx_patients_department ON patients(department);
