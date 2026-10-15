import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaImage, FaDownload, FaUpload } from 'react-icons/fa';
import Spinner from '../components/ui/Spinner';
import useSession from '../hooks/useSession';
import { extractErrorMessage, fileToBase64, logFeatureUsage, removeBackground } from '../lib/api';

export default function RemoveBg() {
  const isLoggedInState = useSession();

  const [file, setFile] = useState(null);
  const [outputUrl, setOutputUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isSelecting, setIsSelecting] = useState(false);
  const [selection, setSelection] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const imageRef = useRef(null);
  const objectUrlsRef = useRef({ preview: '', output: '' });

  // Memory: release every blob URL this component created.
  useEffect(() => {
    const urls = objectUrlsRef.current;
    return () => {
      if (urls.preview) URL.revokeObjectURL(urls.preview);
      if (urls.output) URL.revokeObjectURL(urls.output);
    };
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setOutputUrl('');
      if (objectUrlsRef.current.output) {
        URL.revokeObjectURL(objectUrlsRef.current.output);
        objectUrlsRef.current.output = '';
      }
      if (objectUrlsRef.current.preview) URL.revokeObjectURL(objectUrlsRef.current.preview);
      const preview = URL.createObjectURL(selectedFile);
      objectUrlsRef.current.preview = preview;
      setPreviewUrl(preview);
      setIsSelecting(true);
      setSelection({ x: 0, y: 0, width: 0, height: 0 });
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

  /**
   * The selection is tracked in CSS pixels of the *displayed* image, but
   * remove.bg expects coordinates in the original image's pixels. Scale and
   * clamp accordingly, otherwise the crop hits the wrong region on scaled or
   * lazy-loaded images.
   */
  const getSelectionInImagePixels = () => {
    const img = imageRef.current;
    if (!img || selection.width <= 0 || selection.height <= 0) return null;

    const rect = img.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    const naturalWidth = img.naturalWidth || rect.width;
    const naturalHeight = img.naturalHeight || rect.height;
    const scaleX = naturalWidth / rect.width;
    const scaleY = naturalHeight / rect.height;
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    const x = clamp(Math.round(selection.x * scaleX), 0, naturalWidth - 1);
    const y = clamp(Math.round(selection.y * scaleY), 0, naturalHeight - 1);
    const width = clamp(Math.round(selection.width * scaleX), 1, naturalWidth - x);
    const height = clamp(Math.round(selection.height * scaleY), 1, naturalHeight - y);

    if (width <= 0 || height <= 0) return null;
    return { x, y, width, height };
  };

  const handleUpload = async () => {
    if (!file) return alert('Please select an image first.');
    setLoading(true);

    if (objectUrlsRef.current.output) {
      URL.revokeObjectURL(objectUrlsRef.current.output);
      objectUrlsRef.current.output = '';
    }
    setOutputUrl('');

    try {
      const imageBase64 = await fileToBase64(file);
      const crop = getSelectionInImagePixels();
      const blob = await removeBackground({ imageBase64, crop });

      const url = URL.createObjectURL(blob);
      objectUrlsRef.current.output = url;
      setOutputUrl(url);

      if (isLoggedInState) await logFeatureUsage('remove-bg');
    } catch (err) {
      const message = await extractErrorMessage(err);
      alert(message || 'Background removal failed. Please try again.');
    }

    setLoading(false);
  };

  const resetSelection = () => {
    setSelection({ x: 0, y: 0, width: 0, height: 0 });
    setIsSelecting(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center page-bg text-white p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-3xl glass-card border border-white/20 rounded-2xl p-10 md:p-12 shadow-2xl space-y-10"
      >
        <div className="text-center">
          <h1 className="text-4xl font-bold gradient-title">
            Background Remover
          </h1>
          <p className="text-sm text-white mt-2">Remove image backgrounds instantly with AI precision</p>
        </div>

        <div className="flex flex-col items-center justify-center p-6 border border-dashed border-white/30 rounded-xl bg-white/10">
          <FaUpload className="w-10 h-10 text-pink-400 mb-4" />
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="image-upload" />
          <label
            htmlFor="image-upload"
            className="cursor-pointer btn-primary text-white px-6 py-3 rounded-lg transition-all"
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
                : 'btn-primary'
            }`}
          >
            {loading ? (
              <>
                <Spinner />
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