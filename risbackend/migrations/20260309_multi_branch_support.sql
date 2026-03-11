-- migrations/20260309_multi_branch_support.sql
-- Add Multi-Branch support to the RIS Platform

BEGIN;

-- 1. Create the branches table
CREATE TABLE IF NOT EXISTS branches (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    address TEXT,
    contact_phone VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default Headquarters branch if not exists
INSERT INTO branches (id, name, code, address, contact_phone)
VALUES (1, 'Headquarters', 'HQ', 'Main Facility', 'N/A')
ON CONFLICT (id) DO NOTHING;

-- Reset sequence to ensure future inserts work correctly
SELECT setval('branches_id_seq', (SELECT MAX(id) FROM branches));

-- 2. Add branch global toggle
ALTER TABLE hospital_settings 
ADD COLUMN IF NOT EXISTS is_multi_branch BOOLEAN DEFAULT false;

-- 3. Add branch_id to core clinical tables
-- Users
ALTER TABLE users ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL;
UPDATE users SET branch_id = 1 WHERE branch_id IS NULL;

-- Patients
ALTER TABLE patients ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(id) ON DELETE RESTRICT;
UPDATE patients SET branch_id = 1 WHERE branch_id IS NULL;

-- Orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(id) ON DELETE RESTRICT;
UPDATE orders SET branch_id = 1 WHERE branch_id IS NULL;

-- PACS Studies
ALTER TABLE pacs_studies ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(id) ON DELETE RESTRICT;
UPDATE pacs_studies SET branch_id = 1 WHERE branch_id IS NULL;

-- PACS Servers
ALTER TABLE pacs_servers ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL;
UPDATE pacs_servers SET branch_id = 1 WHERE branch_id IS NULL;

-- 4. Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_branch ON users(branch_id);
CREATE INDEX IF NOT EXISTS idx_patients_branch ON patients(branch_id);
CREATE INDEX IF NOT EXISTS idx_orders_branch ON orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_pacs_studies_branch ON pacs_studies(branch_id);

COMMIT;
