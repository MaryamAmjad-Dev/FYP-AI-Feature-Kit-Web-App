const path = require('path');
const dotenv = require('dotenv');

// Load backend/.env (all secrets live here — never in source code)
dotenv.config({ path: path.join(__dirname, '.env') });

const nodeEnv = process.env.NODE_ENV || 'development';

const toList = (value) =>
  (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const config = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv,
  isProduction: nodeEnv === 'production',

  // Origins allowed to call the API from a browser
  corsOrigins: toList(process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:4173'),

  // Set to e.g. "loopback", "1" or "true" when running behind a reverse
  // proxy so that rate limiting sees the real client IP.
  trustProxy: process.env.TRUST_PROXY || '',

  db: {
    // Full connection string, e.g. postgresql://user:pass@localhost:5432/webai
    connectionString: process.env.DATABASE_URL || '',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'webai',
    ssl: process.env.PG_SSL === 'true',
  },

  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // Comma separated emails that may read the full usage analytics
  adminEmails: toList(process.env.ADMIN_EMAILS).map((email) => email.toLowerCase()),

  resetTokenTtlMs: Number(process.env.RESET_TOKEN_TTL_MINUTES || 30) * 60 * 1000,

  appUrl: process.env.APP_URL || 'http://localhost:5173',

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
    huggingface: process.env.HUGGINGFACE_API_KEY || '',
  },
};

config.smtp.enabled = Boolean(config.smtp.host);

module.exports = { config };
