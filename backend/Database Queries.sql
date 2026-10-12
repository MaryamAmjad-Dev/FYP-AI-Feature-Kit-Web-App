-- Useful hand-written queries for the AI Feature Kit (PostgreSQL).
--
-- SCHEMA (tables, indexes, migrations): see schema.sql — that file is the
-- single source of truth and is executed automatically on application start.
-- This file intentionally contains NO DDL so the two can never drift apart.
--
--   psql -U postgres -d webai -c "$(cat 'Database Queries.sql')"

-- ---------------------------------------------------------------------------
-- Feature usage per user (what GET /api/feature-usage serves to the History page)
-- ---------------------------------------------------------------------------
-- SELECT ufu.id, ufu.feature, ufu.used_at, u.id AS user_id, u.name, u.email
-- FROM user_feature_usage ufu
-- JOIN users u ON ufu.user_id = u.id
-- ORDER BY ufu.used_at DESC
-- LIMIT 50 OFFSET 0;

-- Usage counts per feature (admin analytics)
-- SELECT feature, COUNT(*) AS uses, MAX(used_at) AS last_used
-- FROM user_feature_usage
-- GROUP BY feature
-- ORDER BY uses DESC;

-- Contact messages (admin: GET /api/admin/contact-messages)
-- SELECT id, name, email, message, created_at
-- FROM contact_messages
-- ORDER BY created_at DESC
-- LIMIT 50 OFFSET 0;

-- Expired password reset codes (also purged automatically at startup)
-- DELETE FROM password_reset_tokens WHERE expires_at < NOW();

-- Revoke every live session of one user (equivalent to a password reset)
-- UPDATE users SET token_version = token_version + 1 WHERE id = $1;

-- Users who never used a feature
-- SELECT id, name, email FROM users u
-- WHERE NOT EXISTS (
--   SELECT 1 FROM user_feature_usage ufu WHERE ufu.user_id = u.id
-- );
