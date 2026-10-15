import React, { useState, useEffect } from 'react';
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

const toProfileState = (user) => ({
  ...EMPTY,
  ...(user || {}),
  skills: Array.isArray(user?.skills) ? user.skills : [],
});

const Profile = () => {
  const [userData, setUserData] = useState(toProfileState(getUser()));
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  const applyUser = (user) => {
    const state = toProfileState(user);
    setUserData(state);
    setName(state.name);
    setRole(state.role);
    setPhone(state.phone);
    setLocation(state.location);
    setBio(state.bio);
    setSkills(state.skills.join(', '));
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
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleEdit = () => {
    setError('');
    setSaved('');
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setError('');
    applyUser(userData);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved('');
    try {
      const res = await apiClient.patch('/profile', {
        name,
        role,
        phone,
        location,
        bio,
        skills: skills.split(',').map((skill) => skill.trim()).filter(Boolean),
        linkedin: userData.linkedin || '',
        github: userData.github || '',
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

  return (
    <div className="min-h-screen py-10 px-4 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 text-white flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-5xl glass-card border border-white/20 rounded-3xl shadow-2xl p-6 md:p-10 space-y-10"
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
          <div className="w-32 h-32 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
            <FaUser className="text-white text-4xl" />
          </div>
          <div className="text-center md:text-left space-y-2">
            {editing ? (
              <input
                aria-label="Name"
                className="text-4xl font-bold gradient-title text-center md:text-left w-full bg-white/10 p-2 rounded"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            ) : (
              <h1 className="text-4xl font-bold gradient-title">
                {userData.name}
              </h1>
            )}
            {editing ? (
              <input
                aria-label="Role"
                className="text-lg text-white/90 w-full bg-white/10 p-2 rounded"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Role"
              />
            ) : (
              <p className="text-lg text-white/90">{userData.role}</p>
            )}
            {(linkedin || github) && (
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
              <FaEnvelope className="text-pink-400" />
              <span>{userData.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <FaPhone className="text-pink-400" />
              {editing ? (
                <input
                  aria-label="Phone"
                  className="bg-white/10 p-1 rounded text-white w-full"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone"
                />
              ) : (
                <span>{userData.phone}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <FaMapMarkerAlt className="text-pink-400" />
              {editing ? (
                <input
                  aria-label="Location"
                  className="bg-white/10 p-1 rounded text-white w-full"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
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
            <h2 className="text-2xl font-semibold mb-2 text-white/90">About</h2>
            {editing ? (
              <textarea
                aria-label="About"
                className="bg-white/10 p-2 rounded text-white w-full"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Bio"
              />
            ) : (
              <p className="text-white/80">{userData.bio}</p>
            )}
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-3 text-white/90">Skills</h3>
            {editing ? (
              <input
                aria-label="Skills"
                className="bg-white/10 p-2 rounded text-white w-full"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="Skills (comma separated)"
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
                disabled={saving}
                className="bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white font-bold py-2 px-6 rounded-lg transition-all"
              >
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
