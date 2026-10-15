const { config, isOriginAllowed } = require('./config/config');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');

const { initSchema, closePool } = require('./db/db');
const { createSharedStore } = require('./middleware/rateLimitStore');
const logger = require('./lib/logger');
const authRoutes = require('./routes/auth.routes');
const usageRoutes = require('./routes/usage.routes');
const aiRoutes = require('./routes/ai.routes');

const app = express();

app.disable('x-powered-by');

// Behind a reverse proxy the client IP must come from X-Forwarded-For,
// otherwise every request would share one rate-limit bucket.
// On Vercel TRUST_PROXY defaults to 1 (see config.js).
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
// credentials:true is required for the httpOnly session cookie; combined with
// the strict origin allow-list and JSON-only bodies this stays CSRF-safe.
app.use(
  cors({
    origin: (origin, callback) => callback(null, !origin || isOriginAllowed(origin)),
    methods: ['GET', 'POST', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 204,
  })
);

// Access log (no query strings — they may carry user input — no bodies).
app.use((req, res, next) => {
  const started = process.hrtime.bigint();
  res.on('finish', () => {
    if (req.originalUrl.startsWith('/api/health')) return;
    const ms = Math.round(Number(process.hrtime.bigint() - started) / 1e4) / 100;
    logger.info('request', {
      method: req.method,
      path: req.originalUrl.split('?')[0],
      status: res.statusCode,
      ms,
    });
  });
  next();
});

// Body size: 1mb everywhere (login, contact, prompts) so a giant JSON body
// cannot be used to exhaust memory. The background-removal proxy is the one
// endpoint that legitimately needs a large payload, so it gets its own parser
// mounted before the global one — body-parser skips a request it already read.
app.use('/api/ai/remove-bg', express.json({ limit: '25mb' }));
app.use(express.json({ limit: '1mb' }));

// Global API rate limit. With UPSTASH_REDIS_REST_URL/TOKEN set the counters
// are shared across serverless instances; otherwise they are per process.
const sharedStore = createSharedStore();
app.use(
  '/api',
  rateLimit({
    windowMs: config.rateLimits.windowMs,
    limit: config.rateLimits.global,
    ...(sharedStore ? { store: sharedStore } : {}),
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
  logger.error('unhandled error', {
    method: req.method,
    path: (req.originalUrl || '').split('?')[0],
    message: err.message,
    stack: config.isProduction ? undefined : err.stack,
  });
  return res.status(500).json({ success: false, message: 'Internal server error' });
});

async function start() {
  try {
    await initSchema();
    logger.info('database schema ready');
  } catch (error) {
    logger.error('could not initialise schema (is PostgreSQL running?)', {
      message: error.message,
    });
  }

  app.listen(config.port, () => {
    logger.info('server listening', { port: config.port, env: config.nodeEnv });
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
