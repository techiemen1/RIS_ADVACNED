CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS compliance_form_f (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id INT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id INT REFERENCES users(id), -- Reporting Radiologist/Sonologist
  
  -- Mandatory PCPNDT Fields
  husband_name VARCHAR(255) NOT NULL,
  address TEXT,
  no_of_children_male INT DEFAULT 0,
  no_of_children_female INT DEFAULT 0,
  lmp_date DATE,
  edd_date DATE,
  gestational_age VARCHAR(50),
  
  -- Clinical Indications (As per Section 4(2) of Act)
  indication_for_scan TEXT NOT NULL, -- e.g., "To monitor fetal growth", "Ruling out ectopic", etc.
  procedure_type VARCHAR(100) DEFAULT 'ULTRASOUND', -- Ultrasound / Amniocentesis / CVS
  
  -- Consent & Declaration
  patient_declaration_accepted BOOLEAN DEFAULT TRUE,
  doctor_declaration_accepted BOOLEAN DEFAULT TRUE,
  patient_signature TEXT, -- Base64 or URL
  doctor_signature TEXT, -- Base64 or URL
  
  -- Status & Audit
  form_status VARCHAR(20) DEFAULT 'DRAFT', -- DRAFT, GENERATED, SUBMITTED
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  submitted_at TIMESTAMP,
  
  -- PDF Storage
  pdf_path TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX idx_form_f_patient ON compliance_form_f(patient_id);
CREATE INDEX idx_form_f_date ON compliance_form_f(generated_at);
