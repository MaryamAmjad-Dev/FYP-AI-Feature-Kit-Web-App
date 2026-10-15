// Vercel serverless entry point.
// Vercel finds this file in backend/api/, and every request to /api/* is
// rewritten here by backend/vercel.json. server.js exports the same Express
// app that `npm start` runs locally.
const app = require('../server.js');
const { initSchema } = require('../db/db');
const logger = require('../lib/logger');

// Create the tables once per cold start (a no-op when SKIP_SCHEMA_INIT=true).
// The promise is cached, so it runs at most once per serverless instance.
let ready = null;

module.exports = (req, res) => {
  // CORS preflights never touch the database — answering them immediately
  // keeps cold starts from timing out the browser's OPTIONS request.
  if (req.method === 'OPTIONS') return app(req, res);

  if (!ready) {
    ready = initSchema().catch((error) => {
      logger.error('schema init failed', { message: error.message });
    });
  }
  return ready.then(() => app(req, res));
};
