const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { config } = require('../config/config');
const logger = require('../lib/logger');

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
  logger.error('PostgreSQL pool error', { message: error.message });
});

// node-pg already returns promises, so the API is: db.query(text, params)
const db = pool;

const SCHEMA_FILE = path.join(__dirname, 'schema.sql');

// schema.sql is the single source of truth (see the header comment there).
// The app runs only the DDL it understands: psql meta-commands (\c, \gexec)
// and the manual "CREATE DATABASE ..." helper are skipped.
function loadSchemaStatements() {
  const raw = fs
    .readFileSync(SCHEMA_FILE, 'utf8')
    // psql meta-commands on their own line: "\c webai", "..." \gexec, ...
    .split('\n')
    .filter((line) => !line.trim().startsWith('\\'))
    .join('\n')
    // the "SELECT 'CREATE DATABASE ...' \gexec" helper for manual setups
    .replace(/SELECT\s+'CREATE DATABASE[\s\S]*?gexec/gi, '');

  const statements = [];
  for (const chunk of raw.split(';')) {
    const lines = chunk.split('\n');
    // Start at the first DDL keyword so leading comments/notes are dropped
    // together with anything the app should not execute.
    const start = lines.findIndex((line) => /^(create|alter|delete)\b/i.test(line.trim()));
    if (start === -1) continue;
    statements.push(lines.slice(start).join('\n').trim());
  }
  return statements;
}

async function initSchema() {
  // On Vercel the tables are usually created once in the Neon SQL editor;
  // SKIP_SCHEMA_INIT=true then keeps cold starts fast.
  if (config.db.skipSchemaInit) return;

  // node-pg allows several statements in one call as long as there are no
  // parameters; we still run them one by one so a failure points at one table.
  for (const statement of loadSchemaStatements()) {
    try {
      await pool.query(statement);
    } catch (error) {
      logger.error('schema statement failed', {
        message: error.message,
        statement: statement.slice(0, 160).replace(/\s+/g, ' '),
      });
      throw error;
    }
  }
}

async function closePool() {
  await pool.end();
}

module.exports = { pool, db, initSchema, closePool };
