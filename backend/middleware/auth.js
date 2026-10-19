const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { config } = require('../config/config');
const { db } = require('../db/db');
const logger = require('../lib/logger');

let jwtSecret = config.jwt.secret;

if (!jwtSecret) {
  if (config.isProduction) {
    throw new Error('JWT_SECRET must be set in .env when NODE_ENV=production.');
  }
  // Dev fallback: sessions die when the server restarts, which is fine locally.
  jwtSecret = crypto.randomBytes(48).toString('hex');
  logger.warn('JWT_SECRET is not set — using a random development secret');
}

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      // Revocation counter: bumped whenever the password changes, so every
      // token issued before a reset becomes invalid on the next request.
      ver: Number.isFinite(Number(user.token_version)) ? Number(user.token_version) : 0,
    },
    jwtSecret,
    { expiresIn: config.jwt.expiresIn }
  );
}

function verifyToken(token) {
  return jwt.verify(token, jwtSecret);
}

/**
 * Parses a Cookie header into a plain object (no cookie-parser dependency —
 * we only ever set/read a single cookie).
 */
function parseCookies(header) {
  const jar = {};
  if (!header || typeof header !== 'string') return jar;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 1) continue;
    const name = part.slice(0, index).trim();
    if (!name || Object.prototype.hasOwnProperty.call(jar, name)) continue;
    const value = part.slice(index + 1).trim();
    try {
      jar[name] = decodeURIComponent(value);
    } catch {
      jar[name] = value;
    }
  }
  return jar;
}

/** Session cookie: httpOnly, so document.cookie can never read the JWT. */
function setSessionCookie(res, token, { remember = false } = {}) {
  res.cookie(config.cookie.name, token, {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: config.cookie.path,
    // remember=false → session cookie (dropped when the browser closes)
    ...(remember ? { maxAge: config.cookie.maxAgeMs } : {}),
  });
}

function clearSessionCookie(res) {
  res.clearCookie(config.cookie.name, {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: config.cookie.path,
  });
}

/**
 * Extracts the bearer token from an Authorization header, falling back to
 * the httpOnly session cookie set at login.
 */
function extractToken(req) {
  const header = req.get('authorization') || '';
  const match = /^\s*Bearer\s+(\S+)\s*$/i.exec(header);
  if (match) return match[1];
  const fromCookie = parseCookies(req.headers && req.headers.cookie)[config.cookie.name];
  return fromCookie || null;
}

// Errors that mean "the database is unreachable", not "this query is wrong".
// Used by requireAuth: during a database outage we must not lock every user
// out of the API (there is nothing to compare the revocation counter against),
// but a genuine query failure still fails closed.
function isDatabaseUnavailable(error) {
  const code = String(error && error.code || '');
  if (/^(08|28|53|57P)/.test(code)) return true;
  // Node's network errors (and pg's connect failures) often arrive with an
  // EMPTY message and only `code` set — matching on the message alone would
  // make a plain "Postgres is not running" look like a broken query, so every
  // authenticated endpoint would answer 500 instead of serving the request.
  if (/^(ECONNREFUSED|ETIMEDOUT|ENOTFOUND|ECONNRESET|EAI_AGAIN|EPIPE|EHOSTUNREACH|ENETUNREACH|ECONNABORTED)$/.test(code)) {
    return true;
  }
  const message = String((error && error.message) || '');
  return /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|ECONNRESET|SASL|password must be|Connection terminated|timeout|socket hang up|no pg HBA|role .* does not exist/i.test(
    message
  );
}

/**
 * Express middleware: 401 unless a valid JWT is presented AND the token has
 * not been revoked by a password change (token_version).
 */
async function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return res
      .status(401)
      .json({ success: false, message: 'Session is invalid or has expired. Please log in again.' });
  }

  try {
    const { rows } = await db.query('SELECT token_version FROM users WHERE id = $1 LIMIT 1', [
      payload.id,
    ]);
    if (!rows[0]) {
      return res
        .status(401)
        .json({ success: false, message: 'Session is invalid or has expired. Please log in again.' });
    }
    const current = Number(rows[0].token_version) || 0;
    const presented = Number(payload.ver) || 0;
    if (current !== presented) {
      return res
        .status(401)
        .json({ success: false, message: 'Your password changed. Please log in again.' });
    }
  } catch (error) {
    if (!isDatabaseUnavailable(error)) {
      logger.error('auth token verification failed', { code: error.code, message: error.message });
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
    // Database unreachable: skip the revocation check rather than deny access.
    logger.warn('auth: skipping token revocation check — database unavailable', {
      code: error.code,
    });
  }

  req.user = payload;
  return next();
}

function isAdmin(email) {
  return typeof email === 'string' && config.adminEmails.includes(email.toLowerCase());
}

function requireAdmin(req, res, next) {
  if (!req.user || !isAdmin(req.user.email)) {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }
  return next();
}

// --- Password reset tokens -------------------------------------------------
// Only the SHA-256 hash is stored, so a database leak does not leak live tokens.

function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashResetToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function isValidResetTokenFormat(token) {
  return typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);
}

module.exports = {
  // Exposed so tests can mint tokens (server-side module, never sent to clients)
  jwtSecret,
  clearSessionCookie,
  extractToken,
  generateResetToken,
  hashResetToken,
  isAdmin,
  isDatabaseUnavailable,
  isValidResetTokenFormat,
  parseCookies,
  requireAdmin,
  requireAuth,
  setSessionCookie,
  signToken,
  verifyToken,
};
