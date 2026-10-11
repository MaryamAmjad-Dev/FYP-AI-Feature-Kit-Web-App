const { config, isOriginAllowed } = require('./config');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');

const { initSchema, closePool } = require('./db');
const authRoutes = require('./routes/auth.routes');
const usageRoutes = require('./routes/usage.routes');
const aiRoutes = require('./routes/ai.routes');

const app = express();

app.disable('x-powered-by');

// Behind a reverse proxy the client IP must come from X-Forwarded-For,
// otherwise every request would share one rate-limit bucket.
// On Vercel set TRUST_PROXY=1 (one proxy hop).
if (config.trustProxy !== null) {
  app.set('trust proxy', config.trustProxy);
}

// Security headers (helmet)
app.use(
  helmet({
    contentSecurityPolicy: false, // this process serves a JSON API, not HTML
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // AI results are fetched cross-origin
  })
);

// CORS: only the origins configured in .env (empty origin = non-browser client)
app.use(
  cors({
    origin: (origin, callback) => callback(null, !origin || isOriginAllowed(origin)),
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
  })
);

// 25mb so images can travel as base64 through the AI proxy endpoints
// (the JSON parser limit is what actually caps the upload size)
app.use(express.json({ limit: '25mb' }));

// Global API rate limit
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res, next, options) =>
      res
        .status(options.statusCode)
        .json({ success: false, message: 'Too many requests. Please try again later.' }),
  })
);

app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok' });
});

app.use('/api', authRoutes);
app.use('/api', usageRoutes);
app.use('/api/ai', aiRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'Not found' });
});

// Central error handler (JSON parsing, body size, unexpected failures)
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Request body is too large.' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON body.' });
  }
  console.error('Unhandled error:', err);
  return res.status(500).json({ success: false, message: 'Internal server error' });
});

async function start() {
  try {
    await initSchema();
    console.log('Database schema ready');
  } catch (error) {
    console.error('Could not initialise schema (is PostgreSQL running?):', error.message);
  }

  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });
}

// On Vercel the platform imports this file and calls the exported app for
// every request; only listen when it is started directly (node server.js).
if (require.main === module) {
  start();
}

async function shutdown() {
  try {
    await closePool();
  } finally {
    process.exit(0);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Exported for Vercel's Node.js runtime (api/index.js) and for tests.
module.exports = app;
