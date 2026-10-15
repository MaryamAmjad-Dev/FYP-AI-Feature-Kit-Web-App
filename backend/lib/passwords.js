const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// bcryptjs is a pure-JS implementation, so each hash costs real CPU time.
// 10 rounds keeps logins responsive while remaining the standard baseline.
const BCRYPT_ROUNDS = 10;

// Compared against when an account does not exist, so that a missing account
// and a wrong password take a similar amount of time.
const DUMMY_HASH = bcrypt.hashSync('timing-equalizer-not-a-real-password', BCRYPT_ROUNDS);

function constantTimeEquals(plain, stored) {
  const a = crypto.createHash('sha256').update(String(plain)).digest();
  const b = crypto.createHash('sha256').update(String(stored)).digest();
  return crypto.timingSafeEqual(a, b) && String(plain) === String(stored);
}

async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, BCRYPT_ROUNDS);
}

/**
 * Verifies a password against the stored value.
 * Rows created before hashing existed hold plain text: they are accepted once
 * (constant-time compare) and flagged with `rehash` so the caller can upgrade
 * the stored value to bcrypt immediately after a successful login.
 *
 * @returns {Promise<{ valid: boolean, rehash: boolean }>}
 */
async function verifyPassword(plainPassword, storedPassword) {
  const stored = typeof storedPassword === 'string' ? storedPassword : '';

  if (stored.startsWith('$2')) {
    try {
      const valid = await bcrypt.compare(String(plainPassword), stored);
      return { valid, rehash: false };
    } catch {
      // Corrupt/truncated hash → never accept
      return { valid: false, rehash: false };
    }
  }

  const valid = constantTimeEquals(plainPassword, stored);
  return { valid, rehash: valid };
}

/** Always-false comparison used to equalise timing for unknown accounts. */
async function compareAgainstDummy(plainPassword) {
  const valid = await bcrypt.compare(String(plainPassword), DUMMY_HASH);
  return { valid, rehash: false };
}

module.exports = {
  BCRYPT_ROUNDS,
  compareAgainstDummy,
  hashPassword,
  verifyPassword,
};
