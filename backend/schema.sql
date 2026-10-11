-- PostgreSQL setup for the AI Feature Kit
--
--   psql -U postgres -f schema.sql
--
-- The application also creates these tables automatically on first start,
-- so this file is only needed for a manual, from-scratch setup.

-- Create the database only when it does not exist yet (psql \gexec)
SELECT 'CREATE DATABASE webai'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'webai') \gexec

\c webai

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_feature_usage (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
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
