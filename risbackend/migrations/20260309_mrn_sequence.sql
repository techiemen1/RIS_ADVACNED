-- Migration: 20260309_mrn_sequence.sql
-- Replaces Math.random() MRN generation with a PostgreSQL atomic sequence.
-- The sequence guarantees no duplicates even under concurrent registrations.
--
-- MRN Format: MRN-YYMM-NNNNNN  (e.g. MRN-2603-000142)
-- Sequence:   mrn_seq — starts at 1, no max, no cycle, NO CACHE to ensure gaps are minimal.

-- 1. Create the sequence (skip if already exists)
CREATE SEQUENCE IF NOT EXISTS mrn_seq
  START WITH 1
  INCREMENT BY 1
  NO MAXVALUE
  NO CYCLE;

-- 2. Ensure mrn column exists with UNIQUE constraint
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS mrn TEXT;

ALTER TABLE patients
  ADD CONSTRAINT IF NOT EXISTS uq_patients_mrn UNIQUE (mrn);

-- 3. Backfill existing rows that have NULL mrn with a safe generated value
-- Uses the sequence to guarantee uniqueness during backfill.
UPDATE patients
SET mrn = 'MRN-' ||
          TO_CHAR(created_at, 'YYMM') || '-' ||
          LPAD(nextval('mrn_seq')::TEXT, 6, '0')
WHERE mrn IS NULL;

-- 4. Confirm
SELECT COUNT(*) AS total_patients,
       COUNT(mrn) AS patients_with_mrn,
       COUNT(*) - COUNT(mrn) AS still_null
FROM patients;
