import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FaImage, FaDownload, FaMagic, FaLightbulb } from 'react-icons/fa';
import Spinner from '../components/ui/Spinner';
import useSession from '../hooks/useSession';

import {
  extractErrorMessage,
  generateImage,
  criticizePrompt,
  logFeatureUsage,
} from '../lib/api';

export default function TexttoImage() {
  const isLoggedInState = useSession();

  const [prompt, setPrompt] = useState('');
  // Original generation: { url, prompt }
  const [original, setOriginal] = useState(null);
  // Structured critique returned by the (prompt-based) critic.
  const [critique, setCritique] = useState(null);
  // Refined generation produced from the improved prompt: { url, prompt }
  const [refined, setRefined] = useState(null);

  const [generatingOriginal, setGeneratingOriginal] = useState(false);
  const [critiquing, setCritiquing] = useState(false);
  const [generatingRefined, setGeneratingRefined] = useState(false);
  const [error, setError] = useState(null);

  const originalUrlRef = useRef('');
  const refinedUrlRef = useRef('');

  // Release both object URLs when the component unmounts.
  useEffect(
    () => () => {
      if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
      if (refinedUrlRef.current) URL.revokeObjectURL(refinedUrlRef.current);
    },
    []
  );

  const clearOriginal = () => {
    if (originalUrlRef.current) {
      URL.revokeObjectURL(originalUrlRef.current);
      originalUrlRef.current = '';
    }
    setOriginal(null);
  };
  const clearRefined = () => {
    if (refinedUrlRef.current) {
      URL.revokeObjectURL(refinedUrlRef.current);
      refinedUrlRef.current = '';
    }
    setRefined(null);
  };

  const busy = generatingOriginal || critiquing || generatingRefined;

  // Step 1: generate the original image from the user's prompt.
  const handleGenerate = async () => {
    const p = prompt.trim();
    if (!p) {
      alert('Please enter a description for the image.');
      return;
    }
    setGeneratingOriginal(true);
    setError(null);
    setCritique(null);
    clearRefined();
    clearOriginal();
    try {
      const blob = await generateImage(p);
      const url = URL.createObjectURL(blob);
      originalUrlRef.current = url;
      setOriginal({ url, prompt: p });
      if (isLoggedInState) await logFeatureUsage('text-to-image');
    } catch (err) {
      setError(await extractErrorMessage(err));
    } finally {
      setGeneratingOriginal(false);
    }
  };

  // Step 2: critique the prompt text (no image is inspected).
  const handleCritique = async () => {
    const p = original?.prompt || prompt.trim();
    if (!p) return;
    setCritiquing(true);
    setError(null);
    try {
      setCritique(await criticizePrompt(p));
    } catch (err) {
      setError(await extractErrorMessage(err));
    } finally {
      setCritiquing(false);
    }
  };

  // Step 3: apply the improved prompt and regenerate once.
  const handleApplyAndRegenerate = async () => {
    const p = critique?.improvedPrompt;
    if (!p) return;
    setPrompt(p);
    setGeneratingRefined(true);
    setError(null);
    clearRefined();
    try {
      const blob = await generateImage(p);
      const url = URL.createObjectURL(blob);
      refinedUrlRef.current = url;
      setRefined({ url, prompt: p });
      if (isLoggedInState) await logFeatureUsage('text-to-image');
    } catch (err) {
      setError(await extractErrorMessage(err));
    } finally {
      setGeneratingRefined(false);
    }
  };

  const showSideBySide = Boolean(original && refined);

  return (
    <div className="min-h-screen flex items-center justify-center page-bg text-white px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-4xl glass-card border border-white/20 rounded-2xl p-8 shadow-2xl space-y-8"
      >
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold gradient-title">Text to Image + Self-Critic</h1>
          <p className="text-sm text-white">
            Generate an image, then let the built-in critic improve your prompt and regenerate.
          </p>
        </div>

        {/* Prompt input + generate */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-white">Describe your image</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A serene landscape with mountains and a lake at sunset..."
            className="w-full p-4 rounded-lg bg-white/20 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-400"
            rows="4"
            disabled={busy}
          />

          <button
            onClick={handleGenerate}
            disabled={busy || !prompt.trim()}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              busy || !prompt.trim() ? 'bg-gray-600 cursor-not-allowed' : 'btn-primary'
            }`}
          >
            {generatingOriginal ? (
              <>
                <Spinner />
                Generating original...
              </>
            ) : (
              <>
                <FaImage className="w-5 h-5" />
                Generate Image
              </>
            )}
          </button>
        </div>

        {generatingOriginal && (
          <div className="flex flex-col items-center justify-center p-6 bg-white/10 border border-white/10 rounded-lg text-gray-300">
            <Spinner className="w-8 h-8 mb-2 text-pink-300" />
            Creating your original image...
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center p-6 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
            Error: {error}
          </div>
        )}

        {/* Original image + critique entry point */}
        {original && !generatingOriginal && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <div className="relative">
              <img src={original.url} alt="Generated" className="w-full rounded-xl shadow-xl" />
            </div>

            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleCritique}
                disabled={busy}
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                  busy ? 'bg-gray-600 cursor-not-allowed' : 'btn-primary'
                }`}
              >
                {critiquing ? (
                  <>
                    <Spinner />
                    Critiquing prompt...
                  </>
                ) : (
                  <>
                    <FaLightbulb className="w-5 h-5" />
                    Critique my prompt
                  </>
                )}
              </button>
              <p className="text-xs text-gray-300 text-center max-w-md">
                The critic reads your <span className="font-semibold">text prompt</span> only — it
                does not analyze the image pixels.
              </p>
            </div>
          </motion.div>
        )}

        {/* Critique panel */}
        {critique && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 p-5 rounded-lg bg-white/10 border border-white/15"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FaLightbulb className="text-yellow-300" /> Prompt Critique
              </h2>
              <span className="px-3 py-1 rounded-full text-sm font-bold bg-gradient-to-r from-pink-500 to-purple-500">
                {critique.score}/100
              </span>
            </div>

            <p className="text-sm text-gray-200">{critique.summary}</p>

            {critique.strengths?.length > 0 && (
              <div className="text-sm">
                <p className="font-semibold text-green-300 mb-1">Strengths</p>
                <ul className="list-disc list-inside space-y-1 text-gray-200">
                  {critique.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {critique.improvements?.length > 0 && (
              <div className="text-sm">
                <p className="font-semibold text-amber-300 mb-1">How to improve</p>
                <ul className="list-disc list-inside space-y-1 text-gray-200">
                  {critique.improvements.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="text-sm space-y-1">
              <p className="font-semibold text-blue-300">Improved prompt</p>
              <p className="p-3 rounded bg-black/30 text-gray-100">{critique.improvedPrompt}</p>
            </div>

            <p className="text-xs text-gray-400 italic">{critique.notes}</p>

            <button
              onClick={handleApplyAndRegenerate}
              disabled={busy || Boolean(refined)}
              className={`w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                busy || refined ? 'bg-gray-600 cursor-not-allowed' : 'btn-primary'
              }`}
            >
              {generatingRefined ? (
                <>
                  <Spinner />
                  Regenerating with improved prompt...
                </>
              ) : refined ? (
                <>Refined image generated ✓</>
              ) : (
                <>
                  <FaMagic className="w-5 h-5" />
                  Apply improved prompt &amp; regenerate
                </>
              )}
            </button>
          </motion.div>
        )}

        {generatingRefined && (
          <div className="flex flex-col items-center justify-center p-6 bg-white/10 border border-white/10 rounded-lg text-gray-300">
            <Spinner className="w-8 h-8 mb-2 text-purple-300" />
            Generating the refined image...
          </div>
        )}

        {/* Side-by-side comparison once the refined image exists */}
        {showSideBySide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <h2 className="text-lg font-semibold text-center">Original vs Refined</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm text-center text-gray-300 font-medium">Original</p>
                <img src={original.url} alt="Original" className="w-full rounded-xl shadow-xl" />
                <p className="text-xs text-gray-400 text-center line-clamp-2">{original.prompt}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-center text-gray-300 font-medium">Refined</p>
                <img src={refined.url} alt="Refined" className="w-full rounded-xl shadow-xl" />
                <p className="text-xs text-gray-400 text-center line-clamp-2">{refined.prompt}</p>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4">
              <a
                href={original.url}
                download="generated-image-original.png"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold bg-gradient-to-r from-green-500 to-emerald-600 hover:scale-105 transition-all"
              >
                <FaDownload className="w-5 h-5" />
                Download Original
              </a>
              <a
                href={refined.url}
                download="generated-image-refined.png"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold bg-gradient-to-r from-purple-500 to-pink-600 hover:scale-105 transition-all"
              >
                <FaDownload className="w-5 h-5" />
                Download Refined
              </a>
            </div>
          </motion.div>
        )}

        {/* Single-image download when only the original exists */}
        {original && !refined && !generatingOriginal && (
          <div className="text-center">
            <a
              href={original.url}
              download="generated-image.png"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-lg font-semibold bg-gradient-to-r from-green-500 to-emerald-600 hover:scale-105 transition-all"
            >
              <FaDownload className="w-5 h-5" />
              Download Image
            </a>
          </div>
        )}
      </motion.div>
    </div>
  );
}
