import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaLinkedin,
  FaGithub,
  FaCog,
  FaLock,
} from 'react-icons/fa';

const Profile = () => {
  const [userData, setUserData] = useState({ name: '', email: '', role: '', phone: '', location: '', bio: '', skills: [], linkedin: '', github: '' });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('userData');
    if (stored) {
      const parsed = JSON.parse(stored);
      setUserData((prev) => ({ ...prev, ...parsed }));
      setName(parsed.name || '');
      setRole(parsed.role || '');
      setPhone(parsed.phone || '');
      setLocation(parsed.location || '');
      setBio(parsed.bio || '');
      setSkills((parsed.skills && parsed.skills.join) ? parsed.skills.join(', ') : '');
    }
  }, []);

  const handleEdit = () => setEditing(true);
  const handleSave = () => {
    const updatedSkills = skills.split(',').map(s => s.trim()).filter(Boolean);
    const updatedUser = { ...userData, name, role, phone, location, bio, skills: updatedSkills };
    setUserData(updatedUser);
    const stored = localStorage.getItem('userData');
    if (stored) {
      const parsed = JSON.parse(stored);
      parsed.name = name;
      parsed.role = role;
      parsed.phone = phone;
      parsed.location = location;
      parsed.bio = bio;
      parsed.skills = updatedSkills;
      localStorage.setItem('userData', JSON.stringify(parsed));
    }
    setEditing(false);
  };

  return (
    <div className="min-h-screen py-10 px-4 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 text-white flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-5xl backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-6 md:p-10 space-y-10"
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
          <div className="w-32 h-32 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
            <FaUser className="text-white text-4xl" />
          </div>
          <div className="text-center md:text-left space-y-2">
            {editing ? (
              <input
                className="text-4xl font-bold bg-gradient-to-r from-fuchsia-400 to-rose-500 text-transparent bg-clip-text text-center md:text-left w-full bg-white/10 p-2 rounded"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            ) : (
              <h1 className="text-4xl font-bold bg-gradient-to-r from-fuchsia-400 to-rose-500 text-transparent bg-clip-text">
                {userData.name}
              </h1>
            )}
            {editing ? (
              <input
                className="text-lg text-white/90 w-full bg-white/10 p-2 rounded"
                value={role}
                onChange={e => setRole(e.target.value)}
                placeholder="Role"
              />
            ) : (
              <p className="text-lg text-white/90">{userData.role}</p>
            )}
            <div className="flex justify-center md:justify-start gap-4 pt-2">
              <a href={userData.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400">
                <FaLinkedin size={24} />
              </a>
              <a href={userData.github} target="_blank" rel="noopener noreferrer" className="hover:text-gray-300">
                <FaGithub size={24} />
              </a>
            </div>
          </div>
        </div>

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
                  className="bg-white/10 p-1 rounded text-white w-full"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
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
                  className="bg-white/10 p-1 rounded text-white w-full"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
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
                className="bg-white/10 p-2 rounded text-white w-full"
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Bio"
              />
            ) : (
              <p className="text-white/80">{userData.bio}</p>
            )}
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-3">Skills</h3>
            {editing ? (
              <input
                className="bg-white/10 p-2 rounded text-white w-full"
                value={skills}
                onChange={e => setSkills(e.target.value)}
                placeholder="Skills (comma separated)"
              />
            ) : (
              <div className="flex flex-wrap gap-3">
                {userData.skills.map((skill, i) => (
                  <motion.span
                    key={skill}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="px-4 py-1 text-sm border border-white/20 bg-purple-600/60 rounded-full"
                  >
                    {skill}
                  </motion.span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Edit/Save Button */}
        <div className="flex justify-end">
          {editing ? (
            <button
              onClick={handleSave}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg transition-all"
            >
              Save
            </button>
          ) : (
            <button
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