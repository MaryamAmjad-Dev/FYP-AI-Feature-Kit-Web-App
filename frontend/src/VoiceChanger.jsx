import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaMicrophone, FaPlay, FaStop, FaUpload, FaDownload } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import * as Tone from 'tone';
import audioBufferToWav from 'audiobuffer-to-wav';
import axios from 'axios';



const VoiceChanger = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [audioFile, setAudioFile] = useState(null);
  const [effect, setEffect] = useState('normal');
  const [isPlaying, setIsPlaying] = useState(false);
  const [player, setPlayer] = useState(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showPlayer, setShowPlayer] = useState(false);
  const intervalRef = useRef(null);
  const [processedAudioUrl, setProcessedAudioUrl] = useState(null);

  useEffect(() => {
    const loginStatus = localStorage.getItem('loggedIn') === 'true';
    setIsLoggedIn(loginStatus);
    if (!loginStatus) {
      navigate('/login');
      return;
    }
  }, [navigate]);
  useEffect(() => {
    return () => {
      if (player) player.dispose();
      clearInterval(intervalRef.current);
    };
  }, [player]);

  useEffect(() => {
    if (player) {
      player.playbackRate = playbackRate;
    }
  }, [playbackRate, player]);

  const handleFileChange = (e) => {
    setAudioFile(e.target.files[0]);
    setShowPlayer(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    if (player) player.dispose();
    setPlayer(null);
    setProcessedAudioUrl(null);
  };

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

  const handleApplyEffect = async () => {
    if (!audioFile) return;
    try {
      await Tone.start();
      const url = URL.createObjectURL(audioFile);
      if (player) player.dispose();

      let newPlayer = new Tone.Player(url, () => {
        setDuration(newPlayer.buffer.duration);
      });

      switch (effect) {
        case 'pitchUp':
          newPlayer.connect(new Tone.PitchShift(5).toDestination());
          break;
        case 'pitchDown':
          newPlayer.connect(new Tone.PitchShift(-5).toDestination());
          break;
        case 'robot':
          newPlayer.connect(new Tone.BitCrusher(4).toDestination());
          break;
        case 'echo':
          newPlayer.connect(new Tone.FeedbackDelay("8n", 0.5).toDestination());
          break;
        case 'reverb':
          newPlayer.connect(new Tone.Reverb(2).toDestination());
          break;
        default:
          newPlayer.toDestination();
          break;
      }

      setPlayer(newPlayer);
      setShowPlayer(true);
      setCurrentTime(0);
      // Log feature usage
      const userData = JSON.parse(localStorage.getItem("userData"));
      const userId = userData?.id;
      if (userId) await logFeatureUsage(userId, "voice-changer");
    } catch (error) {
      console.error('Error applying effect:', error);
      alert('Error applying effect. Please try again.');
    }
  };

  const handlePlay = async () => {
    if (!player) return;
    try {
      await Tone.start();
      player.start(undefined, currentTime);
      setIsPlaying(true);
      const startTimestamp = Date.now();
      const startAt = currentTime;
      intervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimestamp) / 1000;
        const newTime = startAt + elapsed * playbackRate;
        setCurrentTime(newTime);
        if (newTime >= duration) handleStop();
      }, 100);
    } catch (error) {
      console.error('Error playing audio:', error);
      alert('Error playing audio. Please try again.');
    }
  };

  const handleStop = () => {
    if (player) {
      player.stop();
      setIsPlaying(false);
      setCurrentTime(0);
      clearInterval(intervalRef.current);
    }
  };

  const handleSpeedChange = (e) => {
    const rate = parseFloat(e.target.value);
    setPlaybackRate(rate);
    if (player) player.playbackRate = rate;
  };

  const handleTimelineChange = (e) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (player && isPlaying) {
      player.stop();
      player.start(undefined, time);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  // ✅ Updated export function to include playbackRate in final download
  const handleExportProcessedAudio = async () => {
    if (!audioFile) return;
    try {
      const arrayBuffer = await audioFile.arrayBuffer();

      // Adjust total frames based on playback speed
      const adjustedLength = Math.ceil((44100 * 40) / playbackRate);
      const audioCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(
        1, adjustedLength, 44100
      );

      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;

      // ✅ Apply selected speed to export
      source.playbackRate.value = playbackRate;

      let destination = audioCtx.destination;

      if (effect === 'pitchUp' || effect === 'pitchDown') {
        const pitchShiftSemis = effect === 'pitchUp' ? 5 : -5;
        source.detune.value = pitchShiftSemis * 100;
        source.connect(destination);
      } else if (effect === 'robot') {
        const bitCrusher = audioCtx.createWaveShaper();
        const curve = new Float32Array(44100);
        for (let i = 0; i < 44100; i++) {
          const x = (i * 2) / 44100 - 1;
          curve[i] = (Math.PI + 4) * x / (Math.PI + 4 * Math.abs(x));
        }
        bitCrusher.curve = curve;
        bitCrusher.oversample = '4x';
        source.connect(bitCrusher);
        bitCrusher.connect(destination);
      } else if (effect === 'echo') {
        const delay = audioCtx.createDelay();
        delay.delayTime.value = 0.3;
        const feedback = audioCtx.createGain();
        feedback.gain.value = 0.4;
        delay.connect(feedback);
        feedback.connect(delay);
        source.connect(delay);
        delay.connect(destination);
      } else if (effect === 'reverb') {
        const convolver = audioCtx.createConvolver();
        const impulseLength = audioCtx.sampleRate * 0.5;
        const impulse = audioCtx.createBuffer(2, impulseLength, audioCtx.sampleRate);
        for (let channel = 0; channel < 2; channel++) {
          const channelData = impulse.getChannelData(channel);
          for (let i = 0; i < impulseLength; i++) {
            channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / impulseLength, 2) * 0.3;
          }
        }
        convolver.buffer = impulse;
        source.connect(convolver);
        convolver.connect(destination);
      } else {
        source.connect(destination);
      }

      source.start();
      const renderedBuffer = await audioCtx.startRendering();
      const wav = audioBufferToWav(renderedBuffer);
      const wavBlob = new Blob([wav], { type: 'audio/wav' });
      const url = URL.createObjectURL(wavBlob);
      setProcessedAudioUrl(url);
    } catch (error) {
      console.error('Error exporting audio:', error);
      alert('Error exporting audio. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-900 via-purple-900 to-indigo-900 bg-[length:200%_200%] animate-gradient-x text-white p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto backdrop-blur-xl bg-white/10 rounded-2xl p-6 shadow-2xl space-y-10"
      >
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-fuchsia-400 to-rose-500 text-transparent bg-clip-text">
            Voice Changer
          </h1>
          <p className="text-sm mt-2">Transform your voice with our advanced AI-powered effects</p>
        </div>

        <div className="flex flex-col items-center p-8 border border-white/30 rounded-xl bg-white/10">
          <FaUpload className="w-12 h-12 text-purple-300 mb-4" />
          <input type="file" accept="audio/*" onChange={handleFileChange} className="hidden" id="audio-upload" />
          <label htmlFor="audio-upload" className="cursor-pointer bg-gradient-to-r from-pink-500 to-indigo-500 text-white px-6 py-3 rounded-lg">
            Choose Audio File
          </label>
          {audioFile && <p className="mt-4 text-sm text-white/70">Selected: {audioFile.name}</p>}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { value: 'normal', label: 'Normal', from: 'gray-600', to: 'gray-800' },
            { value: 'pitchUp', label: 'Pitch Up', from: 'blue-500', to: 'indigo-600' },
            { value: 'pitchDown', label: 'Pitch Down', from: 'yellow-400', to: 'yellow-600' },
            { value: 'robot', label: 'Robot', from: 'red-500', to: 'pink-600' },
            { value: 'echo', label: 'Echo', from: 'green-500', to: 'emerald-600' },
            { value: 'reverb', label: 'Reverb', from: 'purple-500', to: 'violet-600' }
          ].map(option => (
            <button
              key={option.value}
              onClick={() => setEffect(option.value)}
              className={`px-4 py-3 rounded-lg text-white bg-gradient-to-r from-${option.from} to-${option.to} ${effect === option.value ? 'ring-2 ring-white scale-105' : ''}`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="flex justify-center gap-4 w-full flex-wrap">
            <button onClick={handleApplyEffect} disabled={!audioFile} className="px-8 py-4 rounded-xl font-semibold bg-gradient-to-r from-green-500 to-emerald-600">
              <FaPlay /> Apply with Effect
            </button>
            {showPlayer && (
              <>
                <button onClick={handlePlay} disabled={isPlaying || !player} className="px-8 py-4 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-indigo-600">
                  <FaPlay /> Play
                </button>
                <button onClick={handleStop} disabled={!isPlaying && currentTime === 0} className="px-8 py-4 rounded-xl font-semibold bg-gradient-to-r from-red-500 to-pink-600">
                  <FaStop /> Stop
                </button>
              </>
            )}
            <button onClick={handleExportProcessedAudio} disabled={!audioFile} className="px-8 py-4 rounded-xl font-semibold bg-gradient-to-r from-green-500 to-emerald-600">
              Export Processed Audio
            </button>
            {processedAudioUrl && (
              <a href={processedAudioUrl} download={`processed-${effect}-${audioFile?.name.replace(/\.[^/.]+$/, "")}.wav`} className="px-8 py-4 rounded-xl font-semibold bg-gradient-to-r from-green-500 to-emerald-600">
                <FaDownload /> Download Processed Audio
              </a>
            )}
          </div>

          {showPlayer && (
            <div className="w-full flex flex-col items-center">
              <label className="text-lg font-semibold text-purple-300 mb-2">
                Playback Speed: {playbackRate}x
              </label>
              <input type="range" min={0.5} max={2} step={0.01} value={playbackRate} onChange={handleSpeedChange} className="w-full accent-purple-500" />
              {duration > 0 && (
                <>
                  <label className="text-lg font-semibold text-purple-300 mb-2">
                    Timeline: {formatTime(currentTime)} / {formatTime(duration)}
                  </label>
                  <input type="range" min={0} max={duration} step={0.1} value={currentTime} onChange={handleTimelineChange} className="w-full accent-purple-500" />
                </>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default VoiceChanger;