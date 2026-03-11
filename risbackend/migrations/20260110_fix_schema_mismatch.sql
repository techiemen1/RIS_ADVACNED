-- Fix Audit Logs
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='timestamp') THEN
        ALTER TABLE audit_logs RENAME COLUMN timestamp TO created_at;
    END IF;
END $$;

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(50);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Standardize PACS Servers (ensure aetitle is consistent or rename if we prefer ae_title)
-- DB has 'aetitle'. My new model used 'ae_title'. Let's stick to 'aetitle' in DB and update Code or vice versa.
-- Let's rename DB column to ae_title to match standard snake_case if we want, but checking pacsModel.js it used aetitle.
-- I will keep DB as 'aetitle' for now to avoid breaking pacsModel.js users.
-- But I will ensure 'base_url' exists as pacsService uses it. (It does, inspected in step 246)
