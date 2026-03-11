-- Migration: enhance_pacs_servers_table
ALTER TABLE pacs_servers ADD COLUMN IF NOT EXISTS protocol VARCHAR(20) DEFAULT 'DICOMWEB'; -- 'DIMSE' or 'DICOMWEB'
ALTER TABLE pacs_servers ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE pacs_servers ADD COLUMN IF NOT EXISTS wado_uri VARCHAR(255); -- for WADO-URI (wado)
ALTER TABLE pacs_servers ADD COLUMN IF NOT EXISTS wado_rs VARCHAR(255);  -- for WADO-RS
ALTER TABLE pacs_servers ADD COLUMN IF NOT EXISTS qido_rs VARCHAR(255);  -- for QIDO-RS
ALTER TABLE pacs_servers ADD COLUMN IF NOT EXISTS stow_rs VARCHAR(255);  -- for STOW-RS
ALTER TABLE pacs_servers ADD COLUMN IF NOT EXISTS transfer_syntax VARCHAR(100); -- e.g. '1.2.840.10008.1.2.1'
-- Set defaults for existing rows (assuming they were web based on previous logic)
UPDATE pacs_servers SET protocol = 'DICOMWEB' WHERE protocol IS NULL;
