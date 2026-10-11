const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { config } = require('./config');

let jwtSecret = config.jwt.secret;

if (!jwtSecret) {
  if (config.isProduction) {
    throw new Error('JWT_SECRET must be set in .env when NODE_ENV=production.');
  }
  // Dev fallback: sessions die when the server restarts, which is fine locally.
  jwtSecret = crypto.randomBytes(48).toString('hex');
  console.warn('[auth] JWT_SECRET is not set — using a random development secret.');
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    jwtSecret,
    { expiresIn: config.jwt.expiresIn }
  );
}

function verifyToken(token) {
  return jwt.verify(token, jwtSecret);
}

/** Extracts the bearer token from an Authorization header. */
function extractToken(req) {
  const header = req.get('authorization') || '';
  const match = /^\s*Bearer\s+(\S+)\s*$/i.exec(header);
  return match ? match[1] : null;
}

/** Express middleware: 401 unless a valid JWT is presented. */
function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }
  try {
    req.user = verifyToken(token);
    return next();
  } catch {
    return res
      .status(401)
      .json({ success: false, message: 'Session is invalid or has expired. Please log in again.' });
  }
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
  extractToken,
  generateResetToken,
  hashResetToken,
  isAdmin,
  isValidResetTokenFormat,
  requireAdmin,
  requireAuth,
  signToken,
  verifyToken,
};
