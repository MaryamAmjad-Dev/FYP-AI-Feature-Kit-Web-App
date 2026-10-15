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
  // Base64 (not raw bytes): ~3MB of base64 ≈ 2.25MB image, which keeps the
  // JSON body comfortably inside Vercel's ~4.5MB request-payload ceiling.
  // Anything larger fails at the platform before it ever reaches this code.
  imageBase64: 3 * 1024 * 1024,
});

// Profile editor fields (users.profile JSONB)
const PROFILE_LIMITS = Object.freeze({
  role: 100,
  phone: 30,
  location: 120,
  bio: 1000,
  skills: 20,
  skillLength: 50,
  url: 300,
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

/**
 * Validates a profile patch. Returns { fields, name? } on success or
 * { error } with a user-facing message. Unknown keys are ignored so a client
 * cannot write arbitrary JSON into users.profile.
 */
function sanitizeProfilePatch(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Invalid profile payload.' };
  }

  const fields = {};
  let name;

  const shortText = (key, limit, label) => {
    if (!(key in body)) return null;
    const value = asString(body[key]).trim();
    if (value.length > limit) return `${label} must be at most ${limit} characters.`;
    fields[key] = value;
    return null;
  };

  const urlField = (key, label) => {
    if (!(key in body)) return null;
    const value = asString(body[key]).trim();
    if (!value) {
      fields[key] = '';
      return null;
    }
    if (value.length > PROFILE_LIMITS.url || !/^https:\/\//i.test(value)) {
      return `${label} must be an https URL.`;
    }
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== 'https:') return `${label} must be an https URL.`;
      fields[key] = parsed.toString();
      return null;
    } catch {
      return `${label} must be an https URL.`;
    }
  };

  if ('name' in body) {
    const error = validateName(body.name);
    if (error) return { error };
    name = asString(body.name).trim();
  }

  const errors = [
    shortText('role', PROFILE_LIMITS.role, 'Role'),
    shortText('phone', PROFILE_LIMITS.phone, 'Phone'),
    shortText('location', PROFILE_LIMITS.location, 'Location'),
    shortText('bio', PROFILE_LIMITS.bio, 'About'),
    urlField('linkedin', 'LinkedIn'),
    urlField('github', 'GitHub'),
  ].filter(Boolean);
  if (errors.length) return { error: errors[0] };

  if ('skills' in body) {
    if (!Array.isArray(body.skills)) return { error: 'Skills must be a list.' };
    if (body.skills.length > PROFILE_LIMITS.skills) {
      return { error: `At most ${PROFILE_LIMITS.skills} skills are allowed.` };
    }
    const skills = [];
    for (const raw of body.skills) {
      if (typeof raw !== 'string') return { error: 'Skills must be a list of text values.' };
      const skill = raw.trim();
      if (!skill) continue;
      if (skill.length > PROFILE_LIMITS.skillLength) {
        return { error: `Each skill must be at most ${PROFILE_LIMITS.skillLength} characters.` };
      }
      if (!skills.includes(skill)) skills.push(skill);
    }
    fields.skills = skills;
  }

  // `name` is a column, not a profile key — never merge it into the JSONB.
  return name !== undefined ? { fields, name } : { fields };
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
  PROFILE_LIMITS,
  asString,
  isKnownFeature,
  isValidEmail,
  normalizeEmail,
  sanitizeProfilePatch,
  validateLogin,
  validateMessage,
  validateName,
  validatePassword,
  validateSignup,
};
