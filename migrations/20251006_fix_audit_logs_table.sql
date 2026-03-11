-- Migration: Fix audit_logs table to match Sequelize model

-- 1️⃣ Ensure ID is integer, auto-increment
ALTER TABLE audit_logs
    ALTER COLUMN id SET DATA TYPE INTEGER USING id::integer;

-- 2️⃣ Set sequence for auto-increment
CREATE SEQUENCE IF NOT EXISTS audit_logs_id_seq
    START WITH 1
    OWNED BY audit_logs.id;

ALTER TABLE audit_logs ALTER COLUMN id SET DEFAULT nextval('audit_logs_id_seq');

-- 3️⃣ Ensure username and role match varchar lengths in model
ALTER TABLE audit_logs
    ALTER COLUMN username TYPE VARCHAR(50),
    ALTER COLUMN role TYPE VARCHAR(20);

-- 4️⃣ Ensure timestamp has default value
ALTER TABLE audit_logs
    ALTER COLUMN timestamp SET DEFAULT CURRENT_TIMESTAMP;

-- ✅ Optional: Reset sequence to max(id)+1 to avoid collisions
DO $$
BEGIN
   PERFORM setval('audit_logs_id_seq', COALESCE((SELECT MAX(id) FROM audit_logs), 0) + 1, false);
END$$;
