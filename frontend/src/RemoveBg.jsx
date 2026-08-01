import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaImage, FaSpinner, FaDownload, FaUpload } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { removeBgApiKey } from './api'; // ✅ import your key
import axios from 'axios';

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

export default function RemoveBg() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [file, setFile] = useState(null);
  const [outputUrl, setOutputUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isSelecting, setIsSelecting] = useState(false);
  const [selection, setSelection] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const imageRef = useRef(null);

  useEffect(() => {
    const loginStatus = localStorage.getItem('loggedIn') === 'true';
    setIsLoggedIn(loginStatus);
    if (!loginStatus) {
      navigate('/login');
      return;
    }
  }, [navigate]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setOutputUrl('');
      const preview = URL.createObjectURL(selectedFile);
      setPreviewUrl(preview);
      setIsSelecting(true);
    }
  };
  

  const handleMouseDown = (e) => {
    if (!isSelecting) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setStartPoint({ x, y });
    setSelection({ x, y, width: 0, height: 0 });
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !isSelecting) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setSelection({
      x: Math.min(startPoint.x, x),
      y: Math.min(startPoint.y, y),
      width: Math.abs(x - startPoint.x),
      height: Math.abs(y - startPoint.y),
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleUpload = async () => {
    if (!file) return alert('Please select an image first.');
    setLoading(true);
    setOutputUrl('');

    const formData = new FormData();
    formData.append('image_file', file);
    if (selection.width > 0 && selection.height > 0) {
      formData.append('x', selection.x);
      formData.append('y', selection.y);
      formData.append('width', selection.width);
      formData.append('height', selection.height);
    }

    try {
      const response = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: {
          'X-Api-Key': removeBgApiKey,
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to remove background');
      const blob = await response.blob();
      setOutputUrl(URL.createObjectURL(blob));
      
      // Log feature usage after successful background removal
      const userData = JSON.parse(localStorage.getItem("userData"));
      const userId = userData?.id;
      if (userId) await logFeatureUsage(userId, "remove-bg");
    } catch (err) {
      alert('Background removal failed. Please try again.');
    }

    setLoading(false);
  };

  const resetSelection = () => {
    setSelection({ x: 0, y: 0, width: 0, height: 0 });
    setIsSelecting(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-900 via-purple-900 to-indigo-900 bg-[length:200%_200%] animate-gradient-x text-white p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-3xl backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-10 md:p-12 shadow-2xl space-y-10"
      >
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-fuchsia-400 to-rose-500 text-transparent bg-clip-text">
            Background Remover
          </h1>
          <p className="text-sm text-white mt-2">Remove image backgrounds instantly with AI precision</p>
        </div>

        <div className="flex flex-col items-center justify-center p-6 border border-dashed border-white/30 rounded-xl bg-white/10">
          <FaUpload className="w-10 h-10 text-pink-400 mb-4" />
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="image-upload" />
          <label
            htmlFor="image-upload"
            className="cursor-pointer bg-gradient-to-r from-pink-500 to-indigo-500 hover:from-pink-600 hover:to-indigo-600 text-white px-6 py-3 rounded-lg transition-all"
          >
            Choose Image
          </label>
          {file && <p className="mt-3 text-sm text-gray-200">Selected: {file.name}</p>}
        </div>

        {previewUrl && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-300">Original Image</h3>
              {selection.width > 0 && (
                <button onClick={resetSelection} className="text-sm text-pink-300 hover:underline">
                  Reset Selection
                </button>
              )}
            </div>
            <div
              className="relative cursor-crosshair"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <img ref={imageRef} src={previewUrl} alt="Preview" className="w-full rounded-xl shadow-2xl" />
              {isSelecting && (
                <div
                  className="absolute border-2 border-pink-400 bg-pink-500/20"
                  style={{
                    left: `${selection.x}px`,
                    top: `${selection.y}px`,
                    width: `${selection.width}px`,
                    height: `${selection.height}px`,
                  }}
                />
              )}
            </div>
            <p className="text-center text-sm text-gray-400">
              Click and drag to select area for background removal (optional)
            </p>
          </div>
        )}

        <div className="text-center">
          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className={`w-full flex items-center justify-center gap-2 py-3 px-6 rounded-lg font-bold transition-all ${
              !file || loading
                ? 'bg-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-pink-500 to-indigo-500 hover:from-pink-600 hover:to-indigo-600'
            }`}
          >
            {loading ? (
              <>
                <FaSpinner className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <FaImage className="w-5 h-5" />
                Remove Background
              </>
            )}
          </button>
        </div>

        {outputUrl && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-300">Processed Image</h3>
            <img src={outputUrl} alt="Processed" className="w-full rounded-xl shadow-2xl" />
            <div className="text-center">
              <a
                href={outputUrl}
                download="no-background.png"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:scale-105 transition-all"
              >
                <FaDownload className="w-5 h-5" />
                Download Image
              </a>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}