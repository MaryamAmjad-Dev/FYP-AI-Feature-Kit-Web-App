import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaImage, FaEraser, FaMicrophone, FaVolumeUp, FaFileAlt } from 'react-icons/fa';

const features = [
  {
    icon: FaEraser,
    title: 'Background Removal',
    description: 'Remove image backgrounds instantly with high-precision AI.',
    path: '/background-removal',
    gradient: 'from-emerald-600 via-teal-500 to-cyan-500',
    iconBg: 'bg-emerald-500',
  },
  {
    icon: FaImage,
    title: 'Text to Image',
    description: 'Generate high-quality visuals from your text with AI magic.',
    path: '/text-to-image',
    gradient: 'from-pink-600 via-rose-500 to-yellow-400',
    iconBg: 'bg-pink-500',
  },
  {
    icon: FaMicrophone,
    title: 'Text to Speech',
    description: 'Convert text to lifelike speech with advanced AI voices.',
    path: '/text-to-speech',
    gradient: 'from-purple-600 via-indigo-600 to-blue-500',
    iconBg: 'bg-purple-500',
  },
  {
    icon: FaVolumeUp,
    title: 'Voice Changer',
    description: 'Modify your voice in real-time with cutting-edge AI.',
    path: '/voice-changer',
    gradient: 'from-cyan-500 via-sky-500 to-indigo-500',
    iconBg: 'bg-cyan-500',
  },
  {
    icon: FaFileAlt,
    title: 'Text Summarizer',
    description: 'Summarize long content into concise, clear text.',
    path: '/text-summarizer',
    gradient: 'from-yellow-500 via-orange-500 to-rose-500',
    iconBg: 'bg-yellow-500',
  },
];

const Features = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-900 via-purple-900 to-indigo-900  bg-[length:300%_300%] animate-gradient-x text-white p-6 md:p-12">
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-fuchsia-400 to-rose-500 text-transparent bg-clip-text">
          Powerful AI Features
        </h1>
        <p className="text-lg md:text-xl text-white">
          Discover the intelligent tools that bring creativity and automation together.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={index}
              whileHover={{ scale: 1.06, rotate: 0.5 }}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className={`bg-gradient-to-br ${feature.gradient} p-1 rounded-2xl shadow-xl hover:shadow-2xl transition-all`}
            >
              <div className="flex flex-col h-full bg-black/30 backdrop-blur-lg rounded-2xl p-6">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-md ${feature.iconBg} mb-4 animate-pulse`}>
                  <Icon className="text-white text-3xl drop-shadow-md" />
                </div>
                <h3 className="text-2xl font-semibold mb-2 text-white">{feature.title}</h3>
                <p className="text-sm mb-6 text-white/90">{feature.description}</p>
                <button
                  onClick={() => navigate(feature.path)}
                  className="mt-auto py-2 px-5 font-semibold text-sm text-white bg-white/10 hover:bg-white/20 rounded-xl transition-all backdrop-blur-md border border-white/20"
                >
                  🚀 Try Now
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Features;
