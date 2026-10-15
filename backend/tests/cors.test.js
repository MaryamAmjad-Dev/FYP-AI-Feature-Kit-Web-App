const test = require('node:test');
const assert = require('node:assert');
const { originMatches, parseCorsOrigins } = require('../config/config');

test('exact origins match only themselves', () => {
  assert.ok(originMatches('https://app.vercel.app', 'https://app.vercel.app'));
  assert.ok(!originMatches('https://app.vercel.app', 'https://evil.vercel.app'));
  assert.ok(!originMatches('http://localhost:5173', 'http://localhost:5174'));
});

test('wildcard allows any subdomain but not the bare domain', () => {
  // Vercel deployment URLs look like project-hash-team.vercel.app — the
  // wildcard has to swallow the dash-separated prefix too.
  assert.ok(
    originMatches(
      'https://*-maryamamjad-projects.vercel.app',
      'https://fyp-ai-feature-kit-web-gyrlovssn-maryamamjad-projects.vercel.app'
    )
  );
  assert.ok(originMatches('https://*.team.vercel.app', 'https://web.team.vercel.app'));
  assert.ok(!originMatches('https://*.team.vercel.app', 'https://team.vercel.app'));
});

test('wildcards respect the scheme and do not match other hosts', () => {
  assert.ok(!originMatches('https://*.vercel.app', 'http://a.vercel.app'));
  assert.ok(!originMatches('https://*.vercel.app', 'https://evil.com'));
  assert.ok(!originMatches('https://*.team.vercel.app', 'https://team.vercel.app.evil.com'));
});

test('a bare "*" origin is never accepted, even with the wildcard opt-in', () => {
  const previous = process.env.CORS_ALLOW_WILDCARD;
  process.env.CORS_ALLOW_WILDCARD = 'true';
  try {
    assert.deepEqual(parseCorsOrigins('*'), []);
    assert.deepEqual(parseCorsOrigins('*://*'), []);
    assert.deepEqual(parseCorsOrigins('localhost:5173'), []); // no scheme
    assert.deepEqual(parseCorsOrigins('https://app.example.com'), ['https://app.example.com']);
  } finally {
    if (previous === undefined) delete process.env.CORS_ALLOW_WILDCARD;
    else process.env.CORS_ALLOW_WILDCARD = previous;
  }
});

test('wildcard hosts require an explicit CORS_ALLOW_WILDCARD opt-in', () => {
  const previous = process.env.CORS_ALLOW_WILDCARD;
  delete process.env.CORS_ALLOW_WILDCARD;
  try {
    // Fail closed: https://*.vercel.app would otherwise trust every Vercel app
    assert.deepEqual(parseCorsOrigins('https://*.vercel.app'), []);
    assert.deepEqual(parseCorsOrigins('https://app.example.com,https://*.vercel.app'), [
      'https://app.example.com',
    ]);

    process.env.CORS_ALLOW_WILDCARD = 'true';
    assert.deepEqual(parseCorsOrigins('https://*.vercel.app'), ['https://*.vercel.app']);
  } finally {
    if (previous === undefined) delete process.env.CORS_ALLOW_WILDCARD;
    else process.env.CORS_ALLOW_WILDCARD = previous;
  }
});
