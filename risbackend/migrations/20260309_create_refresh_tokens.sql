-- Migration: 20260309_create_refresh_tokens.sql
-- Creates the refresh_tokens table for production-grade session management.
-- Tokens are stored as SHA256 hashes — never plaintext.

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          SERIAL      PRIMARY KEY,
  user_id     INTEGER     NOT NULL,
  token_hash  TEXT        NOT NULL UNIQUE,
  device_info TEXT,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked     BOOLEAN     NOT NULL DEFAULT FALSE
);

-- Fast lookup by user (list/revoke all sessions)
CREATE INDEX IF NOT EXISTS idx_rt_user_id  ON refresh_tokens (user_id);

-- Fast lookup by hash on every refresh request
CREATE INDEX IF NOT EXISTS idx_rt_hash     ON refresh_tokens (token_hash);

-- Fast cleanup of expired tokens (background job can use this)
CREATE INDEX IF NOT EXISTS idx_rt_expires  ON refresh_tokens (expires_at);

-- Cleanup: remove fully expired + revoked rows older than 30 days
-- Run periodically: DELETE FROM refresh_tokens WHERE revoked = TRUE AND expires_at < NOW() - INTERVAL '30 days';
