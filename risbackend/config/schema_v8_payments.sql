-- Phase 8: Financial Intelligence Migration
-- Creates tables for payment tracking and RCM

CREATE TABLE IF NOT EXISTS patient_payments (
    id SERIAL PRIMARY KEY,
    study_instance_uid TEXT NOT NULL,
    order_id TEXT NOT NULL, -- Razorpay/Stripe Order ID
    payment_id TEXT, -- Successful Payment ID
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    status TEXT DEFAULT 'pending', -- pending, captured, failed, refunded
    patient_email TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookup by study
CREATE INDEX IF NOT EXISTS idx_payments_study ON patient_payments(study_instance_uid);
CREATE INDEX IF NOT EXISTS idx_payments_order ON patient_payments(order_id);

-- Add 'is_paid' flag to reports or studies if necessary
-- For now, we'll join with patient_payments to determine access.
