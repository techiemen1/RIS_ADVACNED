-- Migration: 20260309_study_arrival_pipeline.sql
-- Adds the pacs_studies table for tracking study arrival events from Orthanc.
-- Also adds fields to the orders table needed for arrival linking.

-- ── 1. pacs_studies table ────────────────────────────────────────────────────
-- Stores each Orthanc study_arrived webhook event as a permanent record.
-- Linked to RIS orders via foreign key when a matching order is found.

CREATE TABLE IF NOT EXISTS pacs_studies (
  id                   SERIAL       PRIMARY KEY,
  study_instance_uid   VARCHAR(128) UNIQUE NOT NULL,
  patient_id_dicom     VARCHAR(64),           -- PatientID from DICOM (may differ from RIS patient ID)
  accession_number     VARCHAR(64),
  modality             VARCHAR(32),
  patient_name         VARCHAR(255),
  study_date           DATE,
  study_description    TEXT,
  series_count         INTEGER DEFAULT 0,
  instance_count       INTEGER DEFAULT 0,
  orthanc_study_id     VARCHAR(128),          -- Orthanc internal UUID
  order_id             INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  assigned_radiologist INTEGER REFERENCES users(id) ON DELETE SET NULL,
  arrival_status       VARCHAR(32) DEFAULT 'ARRIVED',
                       -- ARRIVED | MATCHED | UNSCHEDULED | ASSIGNED
  is_unscheduled       BOOLEAN NOT NULL DEFAULT FALSE,
  raw_payload          JSONB,                 -- Full Orthanc webhook payload (audit trail)
  arrived_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_ps_accession  ON pacs_studies (accession_number);
CREATE INDEX IF NOT EXISTS idx_ps_patient_id ON pacs_studies (patient_id_dicom);
CREATE INDEX IF NOT EXISTS idx_ps_arrived_at ON pacs_studies (arrived_at DESC);
CREATE INDEX IF NOT EXISTS idx_ps_modality   ON pacs_studies (modality);
CREATE INDEX IF NOT EXISTS idx_ps_order      ON pacs_studies (order_id);

-- ── 2. Orders table — add arrived_at timestamp ───────────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pacs_study_id INTEGER REFERENCES pacs_studies(id) ON DELETE SET NULL;

-- ── 3. Radiologist assignment table (modality → user mapping) ────────────────
-- Allows configuring which radiologist handles each modality.
-- Fallback: round-robin among all radiologists if no modality mapping exists.

CREATE TABLE IF NOT EXISTS modality_assignments (
  id           SERIAL  PRIMARY KEY,
  modality     VARCHAR(32) NOT NULL UNIQUE,
  user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Populate with common modalities (harmless if already populated)
INSERT INTO modality_assignments (modality, user_id)
VALUES
  ('CT',  NULL),
  ('MR',  NULL),
  ('CR',  NULL),
  ('DR',  NULL),
  ('DX',  NULL),
  ('US',  NULL),
  ('MG',  NULL),
  ('NM',  NULL),
  ('PT',  NULL),
  ('XA',  NULL),
  ('RF',  NULL),
  ('OT',  NULL)
ON CONFLICT (modality) DO NOTHING;
