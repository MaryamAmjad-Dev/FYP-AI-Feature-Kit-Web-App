const { Pool } = require('pg');
const { config } = require('./config');

// PostgreSQL connection pool: it transparently reconnects, keeps idle
// connections alive and can serve concurrent requests.
// Configure either DB_* variables or a full DATABASE_URL in backend/.env.
const pool = new Pool({
  ...(config.db.connectionString
    ? { connectionString: config.db.connectionString }
    : {
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        password: config.db.password,
        database: config.db.database,
      }),
  max: config.db.poolMax,
  idleTimeoutMillis: 30000,
  // Fail fast instead of hanging past the serverless time limit; the pool
  // simply opens a new connection on the next query.
  connectionTimeoutMillis: 5000,
  // Set PG_SSL=true for managed databases (Neon, Supabase, RDS, ...)
  ssl: config.db.ssl ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (error) => {
  console.error('PostgreSQL pool error:', error.message);
});

// node-pg already returns promises, so the API is: db.query(text, params)
const db = pool;

const SCHEMA = `
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
`;

async function initSchema() {
  // On Vercel the tables are usually created once in the Neon SQL editor;
  // SKIP_SCHEMA_INIT=true then keeps cold starts fast.
  if (config.db.skipSchemaInit) return;

  // node-pg allows several statements in one call as long as there are no
  // parameters; we still run them one by one so a failure points at one table.
  for (const statement of SCHEMA.split(';').map((s) => s.trim()).filter(Boolean)) {
    await pool.query(statement);
  }
}

async function closePool() {
  await pool.end();
}

module.exports = { pool, db, initSchema, closePool };
