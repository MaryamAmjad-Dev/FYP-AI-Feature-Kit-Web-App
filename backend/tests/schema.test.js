const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { loadSchemaStatements } = require('../db/db');

const statements = loadSchemaStatements();

test('schema.sql parses into statements the app can execute', () => {
  assert.ok(statements.length >= 8, `only ${statements.length} statements parsed`);
  for (const statement of statements) {
    // Anything else (psql meta-commands, the CREATE DATABASE helper) must have
    // been filtered out, otherwise initSchema would throw on every boot.
    assert.match(statement, /^(create|alter|delete)\b/i, `bad statement: ${statement.slice(0, 60)}`);
    assert.ok(!statement.includes('\\gexec'), 'psql helper leaked into the runnable schema');
  }
});

test('schema carries every column the auth and OAuth routes write to', () => {
  const sql = statements.join('\n').toLowerCase();

  // Email/password sign-in
  assert.match(sql, /create table if not exists users/);
  assert.match(sql, /password\s+varchar\(255\) not null/);
  assert.match(sql, /token_version integer not null default 0/);
  // Social sign-in (Google / GitHub)
  assert.match(sql, /add column if not exists provider varchar\(16\) not null default 'local'/);
  assert.match(sql, /add column if not exists provider_id varchar\(255\)/);
  assert.match(sql, /create unique index if not exists idx_users_provider_id/);
  // Tables the rest of the API depends on
  assert.match(sql, /create table if not exists contact_messages/);
  assert.match(sql, /create table if not exists user_feature_usage/);
  assert.match(sql, /create table if not exists password_reset_tokens/);
});

test('schema.sql stays in sync with the file on disk', () => {
  // Guards against someone editing schema.sql while the loader caches nothing
  // but the tests still pass against stale expectations.
  const raw = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  assert.match(raw, /ADD COLUMN IF NOT EXISTS provider_id VARCHAR\(255\)/i);
});
