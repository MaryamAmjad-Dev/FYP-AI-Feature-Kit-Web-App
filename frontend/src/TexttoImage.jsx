import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { FaImage, FaSpinner, FaDownload } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

// ✅ Your Stability API Key
import { stabiApiKey } from "./api";

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

export default function TexttoImage() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    const loginStatus = localStorage.getItem('loggedIn') === 'true';
    setIsLoggedIn(loginStatus);
    if (!loginStatus) {
      navigate('/login');
      return;
    }
  }, [navigate]);
  const generateImage = async () => {
    if (!prompt.trim()) {
      alert('Please enter a description for the image.');
      return;
    }

    setLoading(true);
    setImageUrl('');
    setError(null);

    try {
      const formData = new FormData();
      formData.append("prompt", prompt);
      formData.append("output_format", "png");

      const response = await fetch("https://api.stability.ai/v2beta/stable-image/generate/core", {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stabiApiKey}`,
          'Accept': 'image/*'
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status} - ${errorText}`);
      }

      const blob = await response.blob();
      const imageObjectUrl = URL.createObjectURL(blob);
      setImageUrl(imageObjectUrl);
      // Log feature usage
      const userData = JSON.parse(localStorage.getItem("userData"));
      const userId = userData?.id;
      if (userId) await logFeatureUsage(userId, "text-to-image");
    } catch (err) {
      setError(err.message);
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-900 via-purple-900 to-indigo-900 bg-[length:200%_200%] animate-gradient-x text-white px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-3xl backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl space-y-8"
      >
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-fuchsia-400 to-rose-500 text-transparent bg-clip-text">Text to Image Generator</h1>
          <p className="text-sm text-white">Transform your imagination into stunning visuals with AI</p>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-medium text-white">Describe your image</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A serene landscape with mountains and a lake at sunset..."
            className="w-full p-4 rounded-lg bg-white/20 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-400"
            rows="4"
          />

          <button
            onClick={generateImage}
            disabled={loading || !prompt.trim()}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              loading || !prompt.trim()
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-pink-500 to-indigo-500 hover:from-pink-600 hover:to-indigo-600'
            }`}
          >
            {loading ? (
              <>
                <FaSpinner className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FaImage className="w-5 h-5" />
                Generate Image
              </>
            )}
          </button>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center p-6 bg-white/10 border border-white/10 rounded-lg text-gray-300">
            <FaSpinner className="w-8 h-8 animate-spin mb-2 text-pink-300" />
            Creating your masterpiece...
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center p-6 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
            Error: {error}
          </div>
        )}

        {imageUrl && !error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <div className="relative">
              <img
                src={imageUrl}
                alt="Generated"
                className="w-full rounded-xl shadow-xl"
              />
            </div>
            <div className="text-center">
              <a
                href={imageUrl}
                download="generated-image.png"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-lg font-semibold bg-gradient-to-r from-green-500 to-emerald-600 hover:scale-105 transition-all"
              >
                <FaDownload className="w-5 h-5" />
                Download Image
              </a>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}