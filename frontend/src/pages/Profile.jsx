import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaLinkedin,
  FaGithub,
} from 'react-icons/fa';
import apiClient from '../lib/apiClient';
import { extractErrorMessage } from '../lib/api';
import { getUser, updateUser } from '../lib/auth';
import { safeExternalUrl } from '../lib/urls';
import Spinner from '../components/ui/Spinner';

const EMPTY = {
  name: '',
  email: '',
  role: '',
  phone: '',
  location: '',
  bio: '',
  skills: [],
  linkedin: '',
  github: '',
};

// Mirrors backend/lib/validators.js PROFILE_LIMITS — same numbers the server
// enforces, so the editor can reject bad input before a round-trip.
const LIMITS = {
  name: 100,
  role: 100,
  phone: 30,
  location: 120,
  bio: 1000,
  skills: 20,
  skillLength: 50,
};

const toProfileState = (user) => ({
  ...EMPTY,
  ...(user || {}),
  skills: Array.isArray(user?.skills) ? user.skills : [],
});

/** The editable form lives as one object so dirty-checking stays trivial. */
const toFormState = (profile) => ({
  name: profile.name || '',
  role: profile.role || '',
  phone: profile.phone || '',
  location: profile.location || '',
  bio: profile.bio || '',
  skills: (profile.skills || []).join(', '),
  linkedin: profile.linkedin || '',
  github: profile.github || '',
});

const parseSkills = (value) =>
  value
    .split(',')
    .map((skill) => skill.trim())
    .filter(Boolean);

/** Client-side mirror of sanitizeProfilePatch. Returns an error or null. */
function validateForm(form) {
  const name = form.name.trim();
  if (!name) return 'Name is required.';
  if (name.length > LIMITS.name) return `Name must be at most ${LIMITS.name} characters.`;

  const tooLong = (label, value, limit) =>
    value.length > limit ? `${label} must be at most ${limit} characters.` : null;

  const fieldError =
    tooLong('Role', form.role, LIMITS.role) ||
    tooLong('Phone', form.phone, LIMITS.phone) ||
    tooLong('Location', form.location, LIMITS.location) ||
    tooLong('About', form.bio, LIMITS.bio);
  if (fieldError) return fieldError;

  for (const [key, label] of [
    ['linkedin', 'LinkedIn'],
    ['github', 'GitHub'],
  ]) {
    const value = form[key].trim();
    if (value && !safeExternalUrl(value)) {
      return `${label} must be a full https:// URL (e.g. https://www.${key}.com/you).`;
    }
  }

  const skills = parseSkills(form.skills);
  if (skills.length > LIMITS.skills) {
    return `At most ${LIMITS.skills} skills are allowed — you have ${skills.length}.`;
  }
  const longSkill = skills.find((skill) => skill.length > LIMITS.skillLength);
  if (longSkill) {
    return `Skill "${longSkill}" must be at most ${LIMITS.skillLength} characters.`;
  }

  return null;
}

const inputClass =
  'w-full bg-white/10 border border-white/10 focus:border-pink-400/60 focus:outline-none p-2 rounded text-white placeholder-white/40';

const Profile = () => {
  const [userData, setUserData] = useState(toProfileState(getUser()));
  const [form, setForm] = useState(() => toFormState(toProfileState(getUser())));
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(!getUser());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  const applyUser = (user) => {
    const state = toProfileState(user);
    setUserData(state);
    setForm(toFormState(state));
    updateUser(user);
    return state;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Refresh from the server so the editor starts from persisted data,
        // not from whatever happens to be in localStorage.
        const res = await apiClient.get('/me');
        if (!cancelled && res.data?.user) applyUser(res.data.user);
      } catch (err) {
        // Session problems are handled by the apiClient interceptor; keep
        // whatever we already had and let the user edit that.
        if (!cancelled && err?.response?.status && err.response.status !== 401) {
          setError(await extractErrorMessage(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(toFormState(userData)),
    [form, userData]
  );

  const setField = (key) => (event) => {
    setSaved('');
    setError('');
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const handleEdit = () => {
    setError('');
    setSaved('');
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setError('');
    setSaved('');
    setForm(toFormState(userData)); // discard unsaved edits
  };

  const handleSave = async () => {
    const validationError = validateForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError('');
    setSaved('');
    try {
      const res = await apiClient.patch('/profile', {
        name: form.name.trim(),
        role: form.role.trim(),
        phone: form.phone.trim(),
        location: form.location.trim(),
        bio: form.bio.trim(),
        skills: parseSkills(form.skills),
        linkedin: form.linkedin.trim(),
        github: form.github.trim(),
      });
      if (res.data?.user) {
        applyUser(res.data.user);
        setSaved('Profile saved.');
        setEditing(false);
      }
    } catch (err) {
      setError(await extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const linkedin = safeExternalUrl(userData.linkedin);
  const github = safeExternalUrl(userData.github);
  const skillCount = parseSkills(form.skills).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/80" role="status">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4 page-bg text-white flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-5xl glass-card border border-white/20 rounded-3xl shadow-2xl p-6 md:p-10 space-y-10"
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
          <div className="w-32 h-32 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg shrink-0">
            <FaUser className="text-white text-4xl" />
          </div>
          <div className="text-center md:text-left space-y-2 w-full">
            {editing ? (
              <input
                aria-label="Name"
                maxLength={LIMITS.name}
                className={`${inputClass} text-3xl md:text-4xl font-bold gradient-title text-center md:text-left`}
                value={form.name}
                onChange={setField('name')}
                placeholder="Your name"
              />
            ) : (
              <h1 className="text-4xl font-bold gradient-title">
                {userData.name || 'Your name'}
              </h1>
            )}
            {editing ? (
              <input
                aria-label="Role"
                maxLength={LIMITS.role}
                className={inputClass}
                value={form.role}
                onChange={setField('role')}
                placeholder="Role, e.g. Student / Developer"
              />
            ) : (
              <p className="text-lg text-white/90">{userData.role}</p>
            )}
            {editing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <label className="text-left space-y-1">
                  <span className="text-xs uppercase tracking-wide text-white/60 flex items-center gap-2">
                    <FaLinkedin /> LinkedIn URL
                  </span>
                  <input
                    type="url"
                    inputMode="url"
                    maxLength={300}
                    className={inputClass}
                    value={form.linkedin}
                    onChange={setField('linkedin')}
                    placeholder="https://www.linkedin.com/in/you"
                  />
                </label>
                <label className="text-left space-y-1">
                  <span className="text-xs uppercase tracking-wide text-white/60 flex items-center gap-2">
                    <FaGithub /> GitHub URL
                  </span>
                  <input
                    type="url"
                    inputMode="url"
                    maxLength={300}
                    className={inputClass}
                    value={form.github}
                    onChange={setField('github')}
                    placeholder="https://github.com/you"
                  />
                </label>
              </div>
            ) : (
              (linkedin || github) && (
                <div className="flex justify-center md:justify-start gap-4 pt-2">
                  {linkedin && (
                    <a
                      href={linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-blue-400"
                      aria-label="LinkedIn profile"
                    >
                      <FaLinkedin size={24} />
                    </a>
                  )}
                  {github && (
                    <a
                      href={github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-gray-300"
                      aria-label="GitHub profile"
                    >
                      <FaGithub size={24} />
                    </a>
                  )}
                </div>
              )
            )}
          </div>
        </div>

        {error && (
          <p className="text-red-300 text-sm" role="alert">
            {error}
          </p>
        )}
        {saved && <p className="text-green-300 text-sm">{saved}</p>}

        {/* Contact Info */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-white/90">Contact Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center gap-3">
              <FaEnvelope className="text-pink-400 shrink-0" />
              <span className="break-all">{userData.email}</span>
              <span className="text-xs text-white/50">(login email — can't be changed)</span>
            </div>
            <div className="flex items-center gap-3">
              <FaPhone className="text-pink-400 shrink-0" />
              {editing ? (
                <input
                  aria-label="Phone"
                  maxLength={LIMITS.phone}
                  className={inputClass}
                  value={form.phone}
                  onChange={setField('phone')}
                  placeholder="Phone"
                />
              ) : (
                <span>{userData.phone}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <FaMapMarkerAlt className="text-pink-400 shrink-0" />
              {editing ? (
                <input
                  aria-label="Location"
                  maxLength={LIMITS.location}
                  className={inputClass}
                  value={form.location}
                  onChange={setField('location')}
                  placeholder="Location"
                />
              ) : (
                <span>{userData.location}</span>
              )}
            </div>
          </div>
        </div>

        {/* About & Skills */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-semibold text-white/90">About</h2>
              {editing && (
                <span className="text-xs text-white/50">
                  {form.bio.length}/{LIMITS.bio}
                </span>
              )}
            </div>
            {editing ? (
              <textarea
                aria-label="About"
                maxLength={LIMITS.bio}
                rows={4}
                className={inputClass}
                value={form.bio}
                onChange={setField('bio')}
                placeholder="Tell others about yourself…"
              />
            ) : (
              <p className="text-white/80 whitespace-pre-wrap">{userData.bio}</p>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-semibold text-white/90">Skills</h3>
              {editing && (
                <span className="text-xs text-white/50">
                  {skillCount}/{LIMITS.skills}
                </span>
              )}
            </div>
            {editing ? (
              <input
                aria-label="Skills"
                className={inputClass}
                value={form.skills}
                onChange={setField('skills')}
                placeholder="Skills (comma separated), e.g. React, Node.js, Figma"
              />
            ) : userData.skills.length ? (
              <div className="flex flex-wrap gap-3">
                {userData.skills.map((skill) => (
                  <motion.span
                    key={skill}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="px-4 py-1 text-sm border border-white/20 bg-purple-600/60 rounded-full"
                  >
                    {skill}
                  </motion.span>
                ))}
              </div>
            ) : (
              <p className="text-white/60">No skills added yet.</p>
            )}
          </div>
        </div>

        {/* Edit/Save Button */}
        <div className="flex justify-end gap-3">
          {editing ? (
            <>
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="bg-white/10 hover:bg-white/20 text-white font-bold py-2 px-6 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !dirty}
                className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-2 px-6 rounded-lg transition-all inline-flex items-center gap-2"
              >
                {saving && <Spinner />}
                {saving ? 'Saving…' : 'Save Profile'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleEdit}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg transition-all"
            >
              Edit Profile
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Profile;
