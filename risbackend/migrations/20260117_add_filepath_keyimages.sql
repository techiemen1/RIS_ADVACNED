-- Migration: Add file_path to report_key_images for uploaded images
ALTER TABLE report_key_images ADD COLUMN IF NOT EXISTS file_path TEXT;
