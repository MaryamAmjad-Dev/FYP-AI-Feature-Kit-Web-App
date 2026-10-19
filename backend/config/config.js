const path = require('path');
const dotenv = require('dotenv');
const logger = require('../lib/logger');

// Load backend/.env (all secrets live here — never in source code).
// __dirname is backend/config, so the file one level up is backend/.env —
// the old `path.join(__dirname, '.env')` pointed at a config/.env that does
// not exist, which silently left EVERY value in backend/.env unused (random
// JWT per restart, AI keys and SMTP never picked up).
const backendEnv = path.join(__dirname, '..', '.env');
dotenv.config({ path: backendEnv });
// Optional local override, e.g. backend/config/.env for a second profile.
dotenv.config({ path: path.join(__dirname, '.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

const toList = (value) =>
  (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

// TRUST_PROXY env var -> the value Express understands:
// "true" -> true, "1" -> 1 (hop count), "loopback"/"10.0.0.0/8" -> kept as is.
function parseTrustProxy(value) {
  if (value !== undefined && value !== null && value !== '') {
    if (value === 'false') return null;
    if (value === 'true') return true;
    if (/^\d+$/.test(value)) return Number(value);
    return value;
  }
  // Not configured: on Vercel (or any obvious proxy platform) default to one
  // hop, otherwise every visitor shares the proxy's IP and the rate limiter
  // locks out the whole site. Everywhere else stay on the safe default.
  if (process.env.VERCEL) return 1;
  return null;
}

// CORS origins. Two safety rules, both fail closed:
//   1. A bare "*" (allow every site) is never accepted.
//   2. Host wildcards (https://*.example.com) must be opted into explicitly
//      with CORS_ALLOW_WILDCARD=true — a wildcard such as https://*.vercel.app
//      would trust every Vercel deployment ever created.
function parseCorsOrigins(raw) {
  const patterns = toList(raw);
  const allowed = [];
  for (const pattern of patterns) {
    if (!pattern.includes('://') || /^\*+:\/\/\*$/.test(pattern) || pattern === '*') {
      logger.warn('cors origin ignored — a bare "*" (or scheme-less pattern) is never allowed', {
        pattern,
      });
      continue;
    }
    if (pattern.includes('*') && process.env.CORS_ALLOW_WILDCARD !== 'true') {
      logger.warn('cors origin ignored — wildcard host needs CORS_ALLOW_WILDCARD=true', {
        pattern,
      });
      continue;
    }
    allowed.push(pattern);
  }
  return allowed;
}

const config = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv,
  isProduction,

  // Origins allowed to call the API from a browser. Supports a wildcard in
  // the host (opt-in, see parseCorsOrigins), e.g. https://*.example.com.
  corsOrigins: parseCorsOrigins(
    process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:4173'
  ),

  // Set to e.g. "loopback", "1" or "true" when running behind a reverse
  // proxy so that rate limiting sees the real client IP.
  // (Vercel needs TRUST_PROXY=1 — defaulted above when process.env.VERCEL is set)
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),

  // Session cookie (httpOnly — never readable from JavaScript, so an XSS
  // cannot steal the token the way it could from localStorage).
  cookie: {
    name: 'afk_session',
    // sameSite:"none" is required when the frontend runs on another origin
    // (two Vercel projects); it forces Secure, which is fine behind HTTPS.
    // Plain http dev servers get a same-site cookie instead.
    secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : isProduction,
    sameSite: process.env.COOKIE_SAMESITE || (isProduction ? 'none' : 'lax'),
    maxAgeMs: Number(process.env.COOKIE_MAX_AGE_DAYS || 7) * 24 * 60 * 60 * 1000,
    path: '/',
  },

  db: {
    // Full connection string, e.g. postgresql://user:pass@localhost:5432/webai
    // On Vercel/Neon use the *pooled* endpoint (the one with "-pooler" in it).
    connectionString: process.env.DATABASE_URL || '',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'webai',
    ssl: process.env.PG_SSL === 'true',
    // Serverless platforms keep many short-lived instances: a small pool
    // (1-3) avoids exhausting the database connection limit.
    poolMax: Number(process.env.DB_POOL_MAX) || 10,
    // Set to true on Vercel once the tables exist in Neon (schema.sql),
    // so every cold start skips the CREATE TABLE statements.
    skipSchemaInit: process.env.SKIP_SCHEMA_INIT === 'true',
  },

  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // Comma separated emails that may read the full usage analytics
  adminEmails: toList(process.env.ADMIN_EMAILS).map((email) => email.toLowerCase()),

  resetTokenTtlMs: Number(process.env.RESET_TOKEN_TTL_MINUTES || 30) * 60 * 1000,

  appUrl: process.env.APP_URL || 'http://localhost:5173',

  // Rate limits (all overridable per environment / plan)
  rateLimits: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    global: Number(process.env.RATE_LIMIT_GLOBAL) || 300,
    credentials: Number(process.env.RATE_LIMIT_CREDENTIALS) || 60,
    contact: Number(process.env.RATE_LIMIT_CONTACT) || 5,
    aiWindowMs: Number(process.env.RATE_LIMIT_AI_WINDOW_MS) || 60 * 1000,
    ai: Number(process.env.RATE_LIMIT_AI) || 20,
  },

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'AI Feature Kit <no-reply@localhost>',
  },

  // Third-party AI keys: server-side only, never shipped to the browser
  apiKeys: {
    stability: process.env.STABILITY_API_KEY || '',
    removeBg: process.env.REMOVE_BG_API_KEY || '',
  },
};

config.smtp.enabled = Boolean(config.smtp.host);

// Exact match, or wildcard match where "*" stands for any part of the host.
// "https://*.example.com" matches "https://a.example.com" (but not
// "https://example.com" itself and not "http://a.example.com").
function originMatches(pattern, origin) {
  if (pattern === origin) return true;
  if (!pattern.includes('*')) return false;
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`).test(origin);
}

function isOriginAllowed(origin) {
  return config.corsOrigins.some((pattern) => originMatches(pattern, origin));
}

module.exports = { config, isOriginAllowed, originMatches, parseCorsOrigins };
