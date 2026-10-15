const express = require('express');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const { db } = require('../db/db');
const { config } = require('../config/config');
const { isAdmin, requireAdmin, requireAuth } = require('../middleware/auth');
const logger = require('../lib/logger');
const {
  asString,
  isKnownFeature,
  isValidEmail,
  normalizeEmail,
  validateMessage,
  validateName,
} = require('../lib/validators');

const router = express.Router();

// Contact form: keyed on IP *and* email so rotating one of the two does not
// buy a fresh quota, with a small per-window budget (spam is the goal here).
const contactLimiter = rateLimit({
  windowMs: config.rateLimits.windowMs,
  limit: config.rateLimits.contact,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = normalizeEmail((req.body || {}).email);
    const ip = ipKeyGenerator(req.ip || '');
    return email ? `${ip}|${email}` : ip;
  },
  handler: (req, res, next, options) =>
    res
      .status(options.statusCode)
      .json({ success: false, message: 'Too many messages. Please try again later.' }),
});

/** limit/offset with sane bounds (max 100 rows per page). */
function parsePagination(query) {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 50, 1), 100);
  const offset = Math.max(parseInt(query.offset, 10) || 0, 0);
  return { limit, offset };
}

// POST /api/feature-usage — authenticated; the user id comes from the token,
// never from the request body (a client cannot log usage for someone else).
router.post('/feature-usage', requireAuth, async (req, res) => {
  const body = req.body || {};
  const feature = asString(body.feature).trim();

  if (!isKnownFeature(feature)) {
    return res.status(400).json({ success: false, message: 'Unknown feature.' });
  }

  try {
    await db.query('INSERT INTO user_feature_usage (user_id, feature) VALUES ($1, $2)', [
      req.user.id,
      feature,
    ]);
    return res.json({ success: true });
  } catch (error) {
    logger.error('feature usage log failed', { message: error.message });
    return res.status(500).json({ success: false, message: 'Error logging feature usage' });
  }
});

// GET /api/feature-usage — authenticated: admins see everything,
// everyone else sees only their own history (no PII of other users).
router.get('/feature-usage', requireAuth, async (req, res) => {
  const { limit, offset } = parsePagination(req.query || {});
  try {
    if (isAdmin(req.user.email)) {
      const { rows } = await db.query(
        `SELECT ufu.id, ufu.feature, ufu.used_at, u.id as user_id, u.name, u.email
         FROM user_feature_usage ufu
         JOIN users u ON ufu.user_id = u.id
         ORDER BY ufu.used_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      const total = await db.query('SELECT COUNT(*)::int AS total FROM user_feature_usage');
      return res.json({
        success: true,
        scope: 'all',
        usage: rows,
        pagination: { limit, offset, total: total.rows[0].total },
      });
    }

    const { rows } = await db.query(
      `SELECT id, feature, used_at
       FROM user_feature_usage
       WHERE user_id = $1
       ORDER BY used_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );
    const total = await db.query(
      'SELECT COUNT(*)::int AS total FROM user_feature_usage WHERE user_id = $1',
      [req.user.id]
    );
    return res.json({
      success: true,
      scope: 'own',
      usage: rows,
      pagination: { limit, offset, total: total.rows[0].total },
    });
  } catch (error) {
    logger.error('feature usage fetch failed', { message: error.message });
    return res.status(500).json({ success: false, message: 'Error fetching feature usage' });
  }
});

// POST /api/contact — public, validated and rate limited.
router.post('/contact', contactLimiter, async (req, res) => {
  const body = req.body || {};
  const name = asString(body.name).trim();
  const email = normalizeEmail(body.email);
  const message = asString(body.message).trim();

  const error =
    validateName(name) ||
    (isValidEmail(email) ? null : 'Please enter a valid email address.') ||
    validateMessage(message);
  if (error) {
    return res.status(400).json({ success: false, message: error });
  }

  try {
    await db.query('INSERT INTO contact_messages (name, email, message) VALUES ($1, $2, $3)', [
      name,
      email,
      message,
    ]);
    return res.json({ success: true, message: 'Feedback sent and saved!' });
  } catch (error) {
    logger.error('contact insert failed', { message: error.message });
    return res.status(500).json({ success: false, message: 'Error sending feedback.' });
  }
});

// GET /api/admin/contact-messages — admins only, paginated (messages are
// write-only otherwise, which made the table unread dead weight).
router.get('/admin/contact-messages', requireAuth, requireAdmin, async (req, res) => {
  const { limit, offset } = parsePagination(req.query || {});
  try {
    const { rows } = await db.query(
      'SELECT id, name, email, message, created_at FROM contact_messages ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    const total = await db.query('SELECT COUNT(*)::int AS total FROM contact_messages');
    return res.json({
      success: true,
      messages: rows,
      pagination: { limit, offset, total: total.rows[0].total },
    });
  } catch (error) {
    logger.error('contact fetch failed', { message: error.message });
    return res.status(500).json({ success: false, message: 'Error fetching messages.' });
  }
});

module.exports = router;
