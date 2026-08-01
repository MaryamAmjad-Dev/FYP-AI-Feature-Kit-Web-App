import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { huggingfaceApiKey } from './api';
import {
  FaFileAlt,
  FaSpinner,
  FaCopy,
  FaDownload,
  FaExpand,
  FaCompress,
} from 'react-icons/fa';
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

export default function TextSummarizer() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [text, setText] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  useEffect(() => {
    const loginStatus = localStorage.getItem('loggedIn') === 'true';
    setIsLoggedIn(loginStatus);
    if (!loginStatus) {
      navigate('/login');
      return;
    }
  }, [navigate]);

  const handleSummarize = async () => {
    if (!text.trim()) return alert('Please enter some text to summarize.');

    setLoading(true);
    try {
      const response = await fetch('https://api-inference.huggingface.co/models/facebook/bart-large-cnn', {
        method: 'POST',
        headers: {
          Authorization: huggingfaceApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: text }),
      });
      const data = await response.json();
      if (Array.isArray(data) && data[0]?.summary_text) {
        setSummary(data[0].summary_text);
        // Log feature usage
        const userData = JSON.parse(localStorage.getItem("userData"));
        const userId = userData?.id;
        if (userId) await logFeatureUsage(userId, "text-summarizer");
      } else {
        setSummary('No summary generated.');
      }
    } catch (error) {
      alert('Failed to generate summary. Please try again.');
    }
    setLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    alert('Summary copied to clipboard!');
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([summary], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'summary.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-900 via-purple-900 to-indigo-900 bg-[length:200%_200%] animate-gradient-x text-white p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-3xl backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-10 md:p-12 shadow-2xl space-y-10"
      >
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-fuchsia-400 to-rose-500 text-transparent bg-clip-text">
            Text Summarizer
          </h1>
          <p className="text-sm text-white mt-2">
            Generate concise summaries of your text using AI
          </p>
        </div>

        {/* Input Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Input Text</h2>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-pink-400 hover:text-pink-300 transition-colors"
              title={isExpanded ? 'Compress' : 'Expand'}
            >
              {isExpanded ? <FaCompress /> : <FaExpand />}
            </button>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your text here..."
            className={`w-full px-4 py-3 rounded-xl bg-white/10 text-white border border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none ${
              isExpanded ? 'h-96' : 'h-48'
            }`}
          />
        </div>

        {/* Controls */}
        <div className="flex justify-center">
          <button
            onClick={handleSummarize}
            disabled={!text.trim() || loading}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl font-semibold transition-all ${
              !text.trim() || loading
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-pink-500 to-indigo-500 hover:from-pink-600 hover:to-indigo-600'
            }`}
          >
            {loading ? (
              <>
                <FaSpinner className="w-5 h-5 animate-spin" />
                Summarizing...
              </>
            ) : (
              <>
                <FaFileAlt className="w-5 h-5" />
                Summarize
              </>
            )}
          </button>
        </div>

        {/* Output Section */}
        {loading && (
          <div className="flex flex-col items-center justify-center p-8 bg-white/10 rounded-xl">
            <FaSpinner className="w-12 h-12 animate-spin text-pink-400 mb-4" />
            <p className="text-gray-300">Generating summary...</p>
          </div>
        )}

        {summary && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Summary</h2>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="p-2 text-pink-400 hover:text-pink-300 transition-colors"
                  title="Copy to clipboard"
                >
                  <FaCopy className="w-5 h-5" />
                </button>
                <button
                  onClick={handleDownload}
                  className="p-2 text-green-400 hover:text-green-300 transition-colors"
                  title="Download summary"
                >
                  <FaDownload className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4 bg-white/10 rounded-xl text-white">
              <p className="whitespace-pre-wrap">{summary}</p>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}