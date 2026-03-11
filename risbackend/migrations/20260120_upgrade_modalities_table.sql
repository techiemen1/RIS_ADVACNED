-- Upgrade modalities table
ALTER TABLE modalities ADD COLUMN IF NOT EXISTS ae_title VARCHAR(64);
ALTER TABLE modalities ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);
ALTER TABLE modalities ADD COLUMN IF NOT EXISTS port INTEGER DEFAULT 104;
ALTER TABLE modalities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add uniqueness constraint to ae_title if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'modalities_ae_title_key') THEN
        ALTER TABLE modalities ADD CONSTRAINT modalities_ae_title_key UNIQUE (ae_title);
    END IF;
END
$$;

-- Create index if not exists
CREATE INDEX IF NOT EXISTS idx_modalities_aet ON modalities(ae_title);
