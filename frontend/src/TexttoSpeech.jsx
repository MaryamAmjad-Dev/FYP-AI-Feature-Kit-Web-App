import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
const logFeatureUsage = async (userId, feature) => {
  try {
    await axios.post("http://localhost:5000/api/feature-usage", {
      userId,
      feature,
    });
  } catch (err) {
    console.error("Failed to log feature usage", err);
  }
};  

export default function TexttoSpeech() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [text, setText] = useState('');
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [speechRate, setSpeechRate] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [activeButton, setActiveButton] = useState('');

  useEffect(() => {
    const loginStatus = localStorage.getItem('loggedIn') === 'true';
    setIsLoggedIn(loginStatus);
    if (!loginStatus) {
      navigate('/login');
      return;
    }
  }, [navigate]);
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      if (availableVoices.length > 0) setSelectedVoice(availableVoices[0].name);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  const speak = (textToSpeak, buttonName) => {
    if (!textToSpeak.trim()) return;
    setActiveButton(buttonName);
    const synth = window.speechSynthesis;
    if (synth.speaking || synth.paused) {
      synth.cancel();
    }
    const utter = new SpeechSynthesisUtterance(textToSpeak);
    utter.rate = speechRate;
    const voice = voices.find(v => v.name === selectedVoice);
    if (voice) utter.voice = voice;
    synth.speak(utter);
    setIsPaused(false);
    // Log feature usage
    if (buttonName === 'original') {
      const userData = JSON.parse(localStorage.getItem("userData"));
      const userId = userData?.id;
      if (userId) logFeatureUsage(userId, "text-to-speech");
    }
  };

  const pauseSpeech = () => {
    setActiveButton('pause');
    const synth = window.speechSynthesis;
    if (synth.speaking) {
      if (synth.paused) {
        synth.resume();
        setIsPaused(false);
      } else {
        synth.pause();
        setIsPaused(true);
      }
    }
  };

  const stopSpeech = () => {
    setActiveButton('stop');
    window.speechSynthesis.cancel();
    setIsPaused(false);
  };

  const clearText = () => {
    setActiveButton('clear');
    setText('');
    window.speechSynthesis.cancel();
    setIsPaused(false);
  };

  const buttonStyle = (name) =>
    `px-6 py-2 rounded-lg text-white transition-all bg-gradient-to-r ${
      name === 'original'
        ? 'from-blue-500 to-indigo-600'
        : name === 'pause'
        ? 'from-yellow-400 to-yellow-600'
        : name === 'stop'
        ? 'from-red-500 to-pink-600'
        : 'from-gray-600 to-gray-800'
    } hover:scale-105 ${
      activeButton === name ? 'ring-2 ring-white scale-105' : ''
    }`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-900 via-purple-900 to-indigo-900 bg-[length:200%_200%] animate-gradient-x text-white p-4 md:p-6 lg:p-10">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-5xl backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 md:p-10 lg:p-12 shadow-2xl space-y-10 overflow-visible"
      >
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-fuchsia-400 to-rose-500 text-transparent bg-clip-text">
            Text to Speech Generator
          </h1>
          <p className="text-sm text-white">Convert your text into realistic speech</p>
        </div>

        <div className="space-y-4 overflow-visible">
          <select
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
            className="w-full p-3 rounded bg-white/10 text-white border border-white/30 focus:ring-2 focus:ring-pink-500 focus:outline-none"
          >
            {voices.map(voice => (
              <option key={voice.name} value={voice.name} className="bg-purple-900 text-white">
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>

          <div>
            <label className="block mb-1 text-sm text-gray-300">Speech Rate: {speechRate}x</label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={speechRate}
              onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter your text here..."
            className="w-full h-32 p-4 rounded bg-white/10 text-white border border-pink-400 placeholder-white/70 focus:ring-2 focus:ring-pink-500 focus:outline-none"
          />

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button onClick={() => speak(text, 'original')} className={buttonStyle('original')}>
              Speak Original
            </button>
            <button onClick={pauseSpeech} className={buttonStyle('pause')}>
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button onClick={stopSpeech} className={buttonStyle('stop')}>
              Stop
            </button>
            <button onClick={clearText} className={buttonStyle('clear')}>
              Clear
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}