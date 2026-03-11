-- migrations/2025_create_core_tables.sql

BEGIN;

-- users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  role VARCHAR(50) NOT NULL,
  full_name VARCHAR(200),
  email VARCHAR(200),
  phone VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

-- audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100),
  role VARCHAR(50),
  action TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- roles & permissions
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  module VARCHAR(100) NOT NULL,
  permission VARCHAR(50) NOT NULL,
  PRIMARY KEY (role_id, module, permission)
);

-- system config & addons
CREATE TABLE IF NOT EXISTS system_config (
  key VARCHAR PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS system_addons (
  name VARCHAR PRIMARY KEY,
  enabled BOOLEAN DEFAULT TRUE
);

-- patients
CREATE TABLE IF NOT EXISTS patients (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  dob DATE,
  gender VARCHAR(10),
  phone VARCHAR(50),
  email VARCHAR(200),
  address TEXT,
  insurance_id VARCHAR(100),
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

-- schedules
CREATE TABLE IF NOT EXISTS schedules (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
  modality VARCHAR(50),
  scheduled_time TIMESTAMP,
  notes TEXT,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

-- worklist
CREATE TABLE IF NOT EXISTS worklist (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
  study_instance_uid VARCHAR(255),
  modality VARCHAR(50),
  study_date DATE,
  status VARCHAR(50) DEFAULT 'pending',
  assigned_to VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- reports
CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  worklist_id INTEGER REFERENCES worklist(id) ON DELETE CASCADE,
  patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
  radiologist VARCHAR(100),
  report_text TEXT,
  findings TEXT,
  impression TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

-- billing
CREATE TABLE IF NOT EXISTS billing (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
  worklist_id INTEGER REFERENCES worklist(id),
  amount NUMERIC(12,2),
  payment_status VARCHAR(50) DEFAULT 'pending',
  payment_method VARCHAR(50),
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

-- inventory
CREATE TABLE IF NOT EXISTS inventory (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200),
  category VARCHAR(100),
  quantity INTEGER DEFAULT 0,
  unit_price NUMERIC(12,2),
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

COMMIT;
