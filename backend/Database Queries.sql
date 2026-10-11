-- Useful queries / manual setup for the AI Feature Kit (PostgreSQL)
--
--   psql -U postgres -d webai -f "Database Queries.sql"

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

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Feature usage per user (what the "History" page can display)
-- SELECT ufu.id, ufu.feature, ufu.used_at, u.id AS user_id, u.name, u.email
-- FROM user_feature_usage ufu
-- JOIN users u ON ufu.user_id = u.id
-- ORDER BY ufu.used_at DESC;

-- Clean up expired password reset codes
-- DELETE FROM password_reset_tokens WHERE expires_at < NOW();
