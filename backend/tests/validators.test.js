const test = require('node:test');
const assert = require('node:assert/strict');

const {
  FEATURES,
  LIMITS,
  isKnownFeature,
  isValidEmail,
  normalizeEmail,
  sanitizeProfilePatch,
  validateLogin,
  validateMessage,
  validateName,
  validatePassword,
  validateSignup,
} = require('../validators');

test('normalizeEmail lowercases and trims', () => {
  assert.equal(normalizeEmail('  User@Example.COM '), 'user@example.com');
  assert.equal(normalizeEmail(undefined), '');
  assert.equal(normalizeEmail(42), '');
});

test('isValidEmail accepts real addresses and rejects junk', () => {
  assert.equal(isValidEmail('user@example.com'), true);
  assert.equal(isValidEmail('user+tag@sub.example.co.uk'), true);
  assert.equal(isValidEmail('not-an-email'), false);
  assert.equal(isValidEmail('a@b'), false);
  assert.equal(isValidEmail('a b@c.com'), false);
  assert.equal(isValidEmail(''), false);
  assert.equal(isValidEmail(undefined), false);
});

test('validatePassword enforces length and complexity', () => {
  assert.equal(validatePassword('abc12345'), null); // valid → no error
  assert.ok(validatePassword('abc')); // too short
  assert.ok(validatePassword('abcdefgh')); // no digit
  assert.ok(validatePassword('12345678')); // no letter
  assert.ok(validatePassword(null));
  assert.ok(validatePassword('a'.repeat(200)));
});

test('validateName rejects empty and oversized names', () => {
  assert.equal(validateName('  Ada Lovelace '), null);
  assert.ok(validateName(''));
  assert.ok(validateName('   '));
  assert.ok(validateName('x'.repeat(101)));
  assert.ok(validateName(null));
});

test('validateSignup reports the first problem', () => {
  assert.equal(validateSignup({ name: 'Ada', email: 'ada@example.com', password: 'secret12' }), null);
  assert.ok(validateSignup({ name: '', email: 'ada@example.com', password: 'secret12' }));
  assert.ok(validateSignup({ name: 'Ada', email: 'bad', password: 'secret12' }));
  assert.ok(validateSignup({ name: 'Ada', email: 'ada@example.com', password: 'weak' }));
  assert.ok(validateSignup(undefined));
});

test('validateLogin requires a password but not a strong one', () => {
  assert.equal(validateLogin({ email: 'ada@example.com', password: 'whatever' }), null);
  assert.ok(validateLogin({ email: 'ada@example.com', password: '' }));
  assert.ok(validateLogin({ email: 'nope', password: 'whatever' }));
});

test('isKnownFeature only allows the supported feature list', () => {
  for (const feature of FEATURES) {
    assert.equal(isKnownFeature(feature), true);
  }
  assert.equal(isKnownFeature("'; DROP TABLE users; --"), false);
  assert.equal(isKnownFeature(''), false);
  assert.equal(isKnownFeature(undefined), false);
  assert.equal(isKnownFeature(['text-to-image']), false);
});

test('validateMessage enforces presence and length', () => {
  assert.equal(validateMessage('Hello there'), null);
  assert.ok(validateMessage(''));
  assert.ok(validateMessage('x'.repeat(5001)));
});

test('image payload limit fits inside the serverless request ceiling', () => {
  // ~3MB base64 + JSON framing stays under Vercel's ~4.5MB payload cap; a
  // larger limit would fail at the platform instead of here.
  assert.ok(LIMITS.imageBase64 <= 3.5 * 1024 * 1024);
  assert.ok(LIMITS.imageBase64 > 1024 * 1024);
});

test('sanitizeProfilePatch only accepts known keys', () => {
  const patch = sanitizeProfilePatch({
    role: 'Student',
    phone: '+92 300 1234567',
    location: 'Islamabad',
    bio: 'Builds things',
    skills: ['React', ' React ', 'Node'],
    linkedin: 'https://www.linkedin.com/in/ada',
    github: 'https://github.com/ada',
    isAdmin: true,
    token_version: 999,
  });
  assert.equal(patch.error, undefined);
  assert.deepEqual(patch.fields.skills, ['React', 'Node']); // trimmed + deduped
  assert.equal(patch.fields.role, 'Student');
  assert.ok(!('isAdmin' in patch.fields));
  assert.ok(!('token_version' in patch.fields));
});

test('sanitizeProfilePatch rejects unsafe URLs and oversized fields', () => {
  assert.ok(sanitizeProfilePatch({ linkedin: 'javascript:alert(1)' }).error);
  assert.ok(sanitizeProfilePatch({ linkedin: 'http://insecure.example' }).error);
  assert.ok(sanitizeProfilePatch({ linkedin: 'not a url' }).error);
  assert.equal(sanitizeProfilePatch({ linkedin: '' }).fields.linkedin, '');
  assert.ok(sanitizeProfilePatch({ bio: 'x'.repeat(1001) }).error);
  assert.ok(sanitizeProfilePatch({ skills: 'react,node' }).error);
  assert.ok(sanitizeProfilePatch({ skills: new Array(21).fill('x') }).error);
  assert.ok(sanitizeProfilePatch({ skills: [42] }).error);
  assert.ok(sanitizeProfilePatch('nope').error);
  assert.ok(sanitizeProfilePatch({ name: '' }).error);
});

test('sanitizeProfilePatch never stores name inside the profile JSON', () => {
  const patch = sanitizeProfilePatch({ name: '  Ada  ', role: 'Dev' });
  assert.equal(patch.name, 'Ada');
  assert.equal(patch.fields.name, undefined);
  assert.equal(patch.fields.role, 'Dev');
});
