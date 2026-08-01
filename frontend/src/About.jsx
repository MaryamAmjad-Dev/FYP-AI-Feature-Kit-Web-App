import React from 'react';
import { motion } from 'framer-motion';
import {
  FaRobot,
  FaCode,
  FaUserFriends,
  FaCogs,
  FaEnvelope,
  FaLinkedin,
  FaGithub,
} from 'react-icons/fa';

const About = () => {
  const team = [
    {
      name: 'Maryam Amjad',
      role: 'Project Developer',
      email: 'maryamamjad621@gmail.com',
      linkedin: 'https://www.linkedin.com/in/maryam-amjad-3a235a315/',
      bio: 'Developed the entire project including frontend, backend, and AI integration using React.js, Tailwind CSS, and various APIs.',
    },
    {
      name: 'Aliza Sajjad',
      role: 'Project Developer',
      email: 'alizasajjad26013@gmail.com',
      linkedin: 'https://www.linkedin.com/in/aliza-sajjad-220880326?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app',
      bio: 'Prepared the complete documentation of the project, including structure, features, setup, and technology used with clear explanations.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-900 via-purple-900 to-indigo-900 bg-[length:200%_200%] animate-gradient-x text-white p-6 md:p-12">
      {/* Header */}
      <motion.div
        className="text-center mb-16"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
      >
        <h1 className="text-5xl md:text-6xl font-extrabold mb-4 bg-gradient-to-r from-fuchsia-400 to-rose-500 text-transparent bg-clip-text">
          About Us
        </h1>
        <p className="text-lg md:text-xl text-white max-w-4xl mx-auto">
          We’re a duo of developers passionate about AI, clean design, and user-centered experiences.
        </p>
      </motion.div>

      {/* Feature Highlights */}
      <section className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 mb-20">
        {[
          {
            icon: <FaRobot />,
            title: 'AI Innovation',
            description: 'Using AI to make tools smarter, more creative, and incredibly efficient.',
          },
          {
            icon: <FaCode />,
            title: 'Modern Stack',
            description: 'React.js, Tailwind CSS, Framer Motion & APIs power every product we build.',
          },
          {
            icon: <FaUserFriends />,
            title: 'User First',
            description: 'From layout to features, we focus on real people using real tools.',
          },
          {
            icon: <FaCogs />,
            title: 'Evolving Fast',
            description: 'We iterate, learn, improve. Always building for the future.',
          },
        ].map((item, i) => (
          <motion.div
            key={i}
            className="bg-white/10 border border-white/20 backdrop-blur-md p-6 rounded-2xl shadow-xl hover:shadow-2xl transition"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.2 }}
          >
            <div className="text-4xl text-pink-300 mb-4">{item.icon}</div>
            <h3 className="text-2xl font-bold mb-2">{item.title}</h3>
            <p className="text-gray-300">{item.description}</p>
          </motion.div>
        ))}
      </section>

      {/* Meet the Team */}
      <motion.div
        className="w-full max-w-6xl mx-auto space-y-10"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="text-center mb-10">
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-fuchsia-400 to-rose-500 text-transparent bg-clip-text">
            Meet the Team
          </h2>
          <p className="text-1xl text-white mt-2"><b>Two creators, One vision.</b></p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {team.map((member, idx) => (
            <motion.div
              key={idx}
              className="bg-white/10 border border-white/20 rounded-2xl p-6 text-center shadow-lg hover:scale-105 transition-transform"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.2 }}
            >
              <h3 className="text-2xl font-bold text-white mb-1">{member.name}</h3>
              <p className="text-pink-400 font-semibold">{member.role}</p>
              <p className="text-white mt-3 text-sm">{member.bio}</p>

              <div className="flex justify-center gap-4 mt-5 text-sm flex-wrap">
                {/* Static mailto links */}
                {member.name === 'Maryam Amjad' ? (
                  <a
                    href="mailto:maryamamjad621@gmail.com"
                    className="flex items-center gap-2 text-blue-300 hover:text-pink-300 transition"
                  >
                    <FaEnvelope className="text-pink-300" /> Email
                  </a>
                ) : (
                  <a
                    href="mailto:aliza@example.com"
                    className="flex items-center gap-2 text-blue-300 hover:text-pink-300 transition"
                  >
                    <FaEnvelope className="text-pink-300" /> Email
                  </a>
                )}

                <a
                  href={member.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-300 hover:text-pink-300 transition"
                >
                  <FaLinkedin className="text-pink-300" /> LinkedIn
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Closing */}
      <motion.div
        className="text-center mt-20"
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
      ></motion.div>
    </div>
  );
};

export default About;
