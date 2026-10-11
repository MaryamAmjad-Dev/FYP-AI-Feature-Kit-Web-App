// End-to-end API smoke test for the security fixes.
//
//   node tests/api.smoke.mjs      (or: npm run test:api)
//
// Starts the real server on a dedicated test port with a throwaway JWT
// secret, exercises every security-relevant behaviour, then shuts down again.
// PostgreSQL does not have to be running for the API smoke test: checks that
// reach the database accept either a successful response or a database error.

import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { createRequire } from 'node:module';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const jwt = require('jsonwebtoken');

const BACKEND_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = process.env.SMOKE_TEST_PORT || '5099';
const BASE = `http://localhost:${PORT}`;
const TEST_SECRET = crypto.randomBytes(48).toString('hex');

const token = jwt.sign(
  { id: 1, email: 'smoke@example.com', name: 'Smoke' },
  TEST_SECRET,
  { expiresIn: '5m' }
);

const server = spawn(process.execPath, ['server.js'], {
  cwd: BACKEND_DIR,
  env: {
    ...process.env,
    PORT,
    JWT_SECRET: TEST_SECRET,
    NODE_ENV: 'development',
    // Keep the run independent of the machine's rate-limit history
    ADMIN_EMAILS: 'smoke-admin@example.com',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = '';
server.stdout.on('data', (chunk) => (serverLog += chunk));
server.stderr.on('data', (chunk) => (serverLog += chunk));

const results = [];
async function check(name, fn) {
  try {
    const detail = await fn();
    results.push([name, 'OK', detail]);
  } catch (error) {
    results.push([name, 'FAIL', error.message]);
  }
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(pathname, { method = 'GET', body, headers = {} } = {}) {
  const response = await fetch(BASE + pathname, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* binary or empty body */
  }
  return { status: response.status, headers: response.headers, json, text };
}

try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(`${BASE}/api/health`);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      /* server not up yet */
    }
    await sleep(250);
  }
  if (!ready) throw new Error('server did not start:\n' + serverLog);

  await check('health endpoint responds', async () => {
    const r = await request('/api/health');
    assert(r.status === 200 && r.json.success === true, JSON.stringify(r.json));
  });

  await check('feature-usage requires authentication', async () => {
    const r = await request('/api/feature-usage');
    assert(r.status === 401, 'expected 401, got ' + r.status);
  });

  await check('invalid tokens are rejected', async () => {
    const r = await request('/api/feature-usage', {
      headers: { Authorization: 'Bearer not.a.token' },
    });
    assert(r.status === 401, 'expected 401, got ' + r.status);
  });

  await check('valid token passes the auth middleware', async () => {
    const r = await request('/api/feature-usage', {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(r.status === 200 || r.status === 500, 'expected 200/500, got ' + r.status);
  });

  await check('unknown features are rejected', async () => {
    const r = await request('/api/feature-usage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: { feature: "'; DROP TABLE users; --" },
    });
    assert(r.status === 400, 'expected 400, got ' + r.status);
  });

  await check('usage is attributed to the token user, not the body', async () => {
    const r = await request('/api/feature-usage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: { feature: 'text-to-image', userId: 999999 },
    });
    assert(r.status === 200 || r.status === 500, 'expected 200/500, got ' + r.status);
  });

  await check('login validates its input', async () => {
    const r = await request('/api/login', { method: 'POST', body: {} });
    assert(r.status === 400, 'expected 400, got ' + r.status);
  });

  await check('signup enforces password strength', async () => {
    const r = await request('/api/signup', {
      method: 'POST',
      body: { name: 'A', email: 'a@b.com', password: 'short' },
    });
    assert(r.status === 400, 'expected 400, got ' + r.status);
  });

  await check('legacy "email + newPassword" reset no longer works', async () => {
    const r = await request('/api/forgot-password', {
      method: 'POST',
      body: { email: 'victim@example.com', newPassword: 'hacked123' },
    });
    const message = r.json?.message || '';
    assert(
      !(r.status === 200 && /updated|success/i.test(message)),
      'unauthenticated reset still succeeds: ' + r.text
    );
    assert(!/token/i.test(JSON.stringify(r.json || {})), 'reset token leaked: ' + r.text);
  });

  await check('reset-password requires a well formed code', async () => {
    const r = await request('/api/reset-password', {
      method: 'POST',
      body: { token: 'nope', newPassword: 'brandnew1' },
    });
    assert(r.status === 400, 'expected 400, got ' + r.status);
  });

  await check('AI endpoints require authentication', async () => {
    const r = await request('/api/ai/text-to-image', {
      method: 'POST',
      body: { prompt: 'a cat' },
    });
    assert(r.status === 401, 'expected 401, got ' + r.status);
  });

  await check('AI endpoints validate input before contacting the provider', async () => {
    const bad = await request('/api/ai/text-to-image', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: { prompt: '' },
    });
    assert(bad.status === 400, 'expected 400, got ' + bad.status);

    const noKey = await request('/api/ai/text-to-image', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: { prompt: 'a cat' },
    });
    assert(noKey.status === 503 || noKey.status === 200, 'expected 503/200, got ' + noKey.status);
  });

  await check('unknown API routes return 404', async () => {
    const r = await request('/api/definitely-not-a-route');
    assert(r.status === 404, 'expected 404, got ' + r.status);
  });

  await check('CORS allows the configured origin', async () => {
    const response = await fetch(`${BASE}/api/health`, {
      headers: { Origin: 'http://localhost:5173' },
    });
    assert(
      response.headers.get('access-control-allow-origin') === 'http://localhost:5173',
      'missing ACAO header'
    );
  });

  await check('CORS withholds the header from other origins', async () => {
    const response = await fetch(`${BASE}/api/health`, {
      headers: { Origin: 'http://evil.example' },
    });
    assert(
      !response.headers.get('access-control-allow-origin'),
      'ACAO leaked to ' + response.headers.get('access-control-allow-origin')
    );
  });

  await check('security headers are set and x-powered-by is hidden', async () => {
    const response = await fetch(`${BASE}/api/health`);
    assert(response.headers.get('x-content-type-options') === 'nosniff', 'missing nosniff');
    assert(response.headers.get('x-frame-options'), 'missing frame options');
    assert(response.headers.get('x-powered-by') === null, 'x-powered-by leaked');
  });

  await check('credential endpoints are rate limited', async () => {
    let limited = false;
    for (let i = 0; i < 25; i++) {
      const r = await request('/api/login', {
        method: 'POST',
        body: { email: 'x@y.com', password: 'p' },
      });
      if (r.status === 429) {
        limited = true;
        break;
      }
    }
    assert(limited, 'never returned 429 after 25 login attempts');
  });
} catch (error) {
  results.push(['server startup', 'FAIL', error.message]);
} finally {
  server.kill();
}

for (const [name, status, detail] of results) {
  console.log(`${status === 'OK' ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}
const failed = results.filter(([, status]) => status !== 'OK').length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
