const test = require('node:test');
const assert = require('node:assert/strict');

const {
  FEATURES,
  isKnownFeature,
  isValidEmail,
  normalizeEmail,
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
