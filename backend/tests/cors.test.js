const test = require('node:test');
const assert = require('node:assert');
const { originMatches } = require('../config');

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
