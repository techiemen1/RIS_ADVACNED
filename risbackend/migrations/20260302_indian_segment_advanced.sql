-- Migration: 20260302_indian_segment_advanced.sql
-- Description: Core tables for ABDM, PNDT, and Referral Modules

-- 1. ABHA & Consent Management
CREATE TABLE IF NOT EXISTS abha_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    abha_number VARCHAR(20) UNIQUE,
    abha_address VARCHAR(100) UNIQUE,
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, VERIFIED, EXPIRED
    kyc_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consent_artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    hi_types TEXT[], -- OP, IP, DISCHARGE_SUMMARY, DIAGNOSTIC_REPORT
    status VARCHAR(20) DEFAULT 'REQUESTED', -- REQUESTED, GRANTED, EXPIRED, REVOKED
    expiry TIMESTAMP,
    consent_id VARCHAR(100), -- Gateway reference
    signature_data TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. PNDT Compliance Core
CREATE TABLE IF NOT EXISTS pndt_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    study_id UUID, -- Links to DICOM study
    form_data JSONB, -- Comprehensive Form F fields
    patient_signature_svg TEXT,
    doctor_signature_svg TEXT,
    is_signed BOOLEAN DEFAULT FALSE,
    certified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Referral & Incentive Module
CREATE TABLE IF NOT EXISTS referral_incentives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referring_doctor_id UUID REFERENCES users(id),
    study_id UUID UNIQUE, -- One incentive per study
    incentive_amount NUMERIC(10,2) DEFAULT 0.00,
    settlement_status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, AUTHORIZED, PAID, VOID
    audit_log JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_abha_patient ON abha_registrations(patient_id);
CREATE INDEX IF NOT EXISTS idx_pndt_study ON pndt_forms(study_id);
CREATE INDEX IF NOT EXISTS idx_referral_doctor ON referral_incentives(referring_doctor_id);
