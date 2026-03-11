-- Migration: Fix Users Schema
-- Date: 2026-02-07
-- Description: Adds missing columns for signature and permissions to users table

-- Signature and Professional Details
ALTER TABLE users ADD COLUMN IF NOT EXISTS signature_path TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS designation VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_number VARCHAR(100);

-- Permissions (Role Based Access Control Granularity)
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_order BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_report BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_schedule BOOLEAN DEFAULT FALSE;

-- Ensure default permissions based on role if they are null
UPDATE users SET can_report = TRUE WHERE role IN ('radiologist', 'doctor') AND can_report IS FALSE;
UPDATE users SET can_order = TRUE WHERE role IN ('doctor', 'receptionist', 'admin') AND can_order IS FALSE;
UPDATE users SET can_schedule = TRUE WHERE role IN ('receptionist', 'admin', 'staff') AND can_schedule IS FALSE;
