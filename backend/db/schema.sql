-- PostgreSQL setup for the AI Feature Kit
--
--   psql -U postgres -f schema.sql
--
-- THIS FILE IS THE SINGLE SOURCE OF TRUTH for the database schema: db.js
-- reads and executes the CREATE/ALTER/INDEX statements below on startup, so
-- the application and a manual setup can never drift apart. The psql helpers
-- (CREATE DATABASE / \c) are ignored by the app.
--
-- Run it once manually only when you prefer not to let the app bootstrap:
--   psql -U postgres -f schema.sql

-- Create the database only when it does not exist yet (psql \gexec)
SELECT 'CREATE DATABASE webai'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'webai') \gexec

\c webai

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  token_version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Columns added after the first release: idempotent upgrades for existing
-- databases (CREATE TABLE IF NOT EXISTS alone would not add them).
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

-- Social login (Google / GitHub): which provider owns the account and the id
-- that provider issued. 'local' = email + password, which is what every row
-- created before this column had becomes (and the default for new ones).
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider VARCHAR(16) NOT NULL DEFAULT 'local';
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255);

-- At most one row per provider account. Partial: password accounts carry no
-- provider id, so they are deliberately outside the index.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider_id
  ON users (provider, provider_id)
  WHERE provider_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS contact_messages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_feature_usage (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature VARCHAR(50) NOT NULL,
  used_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- One-time password reset codes (only the SHA-256 hash is stored)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Lookups: per-user history pages, the admin analytics query and the
-- password-reset code lookup/claim all run through these.
CREATE INDEX IF NOT EXISTS idx_usage_user_used_at
  ON user_feature_usage (user_id, used_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_used_at
  ON user_feature_usage (used_at DESC);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_user
  ON password_reset_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_expires
  ON password_reset_tokens (expires_at);

-- Harden tables created by older releases (they were created without the
-- cascade, which made deleting a user impossible).
ALTER TABLE user_feature_usage
  DROP CONSTRAINT IF EXISTS user_feature_usage_user_id_fkey;
ALTER TABLE user_feature_usage
  ADD CONSTRAINT user_feature_usage_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE password_reset_tokens
  DROP CONSTRAINT IF EXISTS password_reset_tokens_user_id_fkey;
ALTER TABLE password_reset_tokens
  ADD CONSTRAINT password_reset_tokens_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Opportunistic cleanup: expired reset codes are useless, never purge used
-- ones before their TTL (they are single-use already, this only trims old rows).
DELETE FROM password_reset_tokens WHERE expires_at <= NOW();
