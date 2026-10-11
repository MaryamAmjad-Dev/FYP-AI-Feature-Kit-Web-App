// Central server-side validation. Nothing is trusted from the client.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const FEATURES = Object.freeze([
  'text-to-image',
  'remove-bg',
  'voice-changer',
  'text-to-speech',
  'text-summarizer',
]);

const LIMITS = Object.freeze({
  name: 100,
  email: 254,
  passwordMin: 8,
  passwordMax: 128,
  message: 5000,
  prompt: 2000,
  text: 20000,
  imageBase64: 20 * 1024 * 1024,
});

function asString(value) {
  return typeof value === 'string' ? value : '';
}

function normalizeEmail(value) {
  return asString(value).trim().toLowerCase();
}

function isValidEmail(value) {
  const email = normalizeEmail(value);
  return email.length > 0 && email.length <= LIMITS.email && EMAIL_PATTERN.test(email);
}

/** Returns an error message, or null when the password is acceptable. */
function validatePassword(password) {
  if (typeof password !== 'string' || password.length < LIMITS.passwordMin) {
    return `Password must be at least ${LIMITS.passwordMin} characters long.`;
  }
  if (password.length > LIMITS.passwordMax) {
    return `Password must be at most ${LIMITS.passwordMax} characters long.`;
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must contain at least one letter and one number.';
  }
  return null;
}

function validateName(value) {
  const name = asString(value).trim();
  if (!name) return 'Name is required.';
  if (name.length > LIMITS.name) return `Name must be at most ${LIMITS.name} characters.`;
  return null;
}

function isKnownFeature(feature) {
  return typeof feature === 'string' && FEATURES.includes(feature);
}

/** Basic sanity check for free-text bodies (contact form etc.). */
function validateMessage(value) {
  const message = asString(value).trim();
  if (!message) return 'Message is required.';
  if (message.length > LIMITS.message) return `Message must be at most ${LIMITS.message} characters.`;
  return null;
}

function validateSignup({ name, email, password } = {}) {
  return (
    validateName(name) ||
    (isValidEmail(email) ? null : 'Please enter a valid email address.') ||
    validatePassword(password)
  );
}

function validateLogin({ email, password } = {}) {
  return (
    (isValidEmail(email) ? null : 'Please enter a valid email address.') ||
    (asString(password) ? null : 'Password is required.')
  );
}

module.exports = {
  FEATURES,
  LIMITS,
  asString,
  isKnownFeature,
  isValidEmail,
  normalizeEmail,
  validateLogin,
  validateMessage,
  validateName,
  validatePassword,
  validateSignup,
};
