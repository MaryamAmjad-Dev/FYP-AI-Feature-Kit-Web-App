import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaMicrophone, FaPlay, FaStop, FaUpload, FaDownload } from 'react-icons/fa';
import useSession from '../hooks/useSession';
import * as Tone from 'tone';
import audioBufferToWav from 'audiobuffer-to-wav';
import { logFeatureUsage } from '../lib/api';

const VoiceChanger = () => {
  const isLoggedInState = useSession();

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
  const objectUrlsRef = useRef({ source: '', processed: '' });
  // The 100 ms ticker is created once per Play, so anything it reads (rate,
  // duration, the live player) has to come from refs — a plain closure would
  // keep the values the page had when playback started.
  const playbackRateRef = useRef(playbackRate);
  const durationRef = useRef(duration);
  const playerRef = useRef(null);
  const anchorRef = useRef({ startAt: 0, startTimestamp: 0 });

  useEffect(() => {
    playbackRateRef.current = playbackRate;
  }, [playbackRate]);
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  const releaseObjectUrl = (key) => {
    if (objectUrlsRef.current[key]) {
      URL.revokeObjectURL(objectUrlsRef.current[key]);
      objectUrlsRef.current[key] = '';
    }
  };

  // Memory: release blob URLs created for the player/export (unmount only).
  useEffect(() => {
    return () => {
      releaseObjectUrl('source');
      releaseObjectUrl('processed');
    };
  }, []);

  useEffect(() => {
    return () => {
      // The handlers dispose their own player before swapping it (the same
      // instance would otherwise be disposed twice); dispose here only when
      // this is still the live one — i.e. on unmount.
      if (player && playerRef.current === player) player.dispose();
      clearInterval(intervalRef.current);
    };
  }, [player]);

  useEffect(() => {
    if (player) {
      player.playbackRate = playbackRate;
    }
  }, [playbackRate, player]);

  /** Stops the position ticker (and forgets where playback started). */
  const stopTicker = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  };

  /**
   * Starts (or restarts) the ticker from `fromSeconds`. The anchor lives in a
   * ref so seeking and speed changes can move it without restarting playback.
   */
  const startTicker = (fromSeconds) => {
    stopTicker();
    anchorRef.current = { startAt: fromSeconds, startTimestamp: Date.now() };
    intervalRef.current = setInterval(() => {
      const anchor = anchorRef.current;
      const elapsed = (Date.now() - anchor.startTimestamp) / 1000;
      const newTime = anchor.startAt + elapsed * playbackRateRef.current;
      setCurrentTime(newTime);
      if (durationRef.current > 0 && newTime >= durationRef.current) handleStop();
    }, 100);
  };

  /**
   * Records the position we are at RIGHT NOW as a new anchor — used before the
   * playback rate changes, so the displayed timeline stays continuous instead
   * of jumping (elapsed × newRate would otherwise rewrite the whole history).
   */
  const reanchor = () => {
    const anchor = anchorRef.current;
    const elapsed = (Date.now() - anchor.startTimestamp) / 1000;
    anchorRef.current = {
      startAt: anchor.startAt + elapsed * playbackRateRef.current,
      startTimestamp: Date.now(),
    };
  };

  const handleFileChange = (e) => {
    setAudioFile(e.target.files[0]);
    setShowPlayer(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    stopTicker();
    if (player) player.dispose();
    playerRef.current = null;
    setPlayer(null);
    setProcessedAudioUrl(null);
    releaseObjectUrl('processed');
    releaseObjectUrl('source');
  };

  const handleApplyEffect = async () => {
    if (!audioFile) return;
    try {
      await Tone.start();
      if (player) player.dispose();
      playerRef.current = null;
      releaseObjectUrl('source');
      const url = URL.createObjectURL(audioFile);
      objectUrlsRef.current.source = url;

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

      playerRef.current = newPlayer;
      setPlayer(newPlayer);
      setShowPlayer(true);
      // A fresh player means the previous transport is gone: drop the old
      // ticker too, otherwise it keeps counting for a disposed source.
      stopTicker();
      setIsPlaying(false);
      setCurrentTime(0);
      // Log feature usage
      if (isLoggedInState) await logFeatureUsage('voice-changer');
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
      startTicker(currentTime);
    } catch (error) {
      console.error('Error playing audio:', error);
      alert('Error playing audio. Please try again.');
    }
  };

  const handleStop = () => {
    const active = playerRef.current;
    if (active) active.stop();
    stopTicker();
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSpeedChange = (e) => {
    const rate = parseFloat(e.target.value);
    // Move the anchor to "now" while the OLD rate is still in the ref, then
    // switch: the timeline keeps counting from the real current position.
    reanchor();
    playbackRateRef.current = rate;
    setPlaybackRate(rate);
    if (player) player.playbackRate = rate;
  };

  const handleTimelineChange = (e) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (player && isPlaying) {
      player.stop();
      player.start(undefined, time);
      // Re-anchor, otherwise the very next tick would jump back to the
      // position the ticker had when Play was pressed.
      startTicker(time);
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

      // Decode against a throwaway context first: the rendered length has to
      // follow the file's REAL duration. The previous version hard-coded 40
      // seconds, so uploads longer than 40 s were silently truncated (and
      // short ones were padded with seconds of silence).
      const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      const decodeCtx = new OfflineCtx(1, 1, 44100);
      const audioBuffer = await decodeCtx.decodeAudioData(arrayBuffer);

      // Speed shortens the result; 1.5 s of tail keeps the echo/reverb decay
      // from being cut off at the end of the file.
      const renderedSeconds = audioBuffer.duration / playbackRate + 1.5;
      const renderedLength = Math.max(1, Math.ceil(renderedSeconds * 44100));
      const audioCtx = new OfflineCtx(1, renderedLength, 44100);

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
      releaseObjectUrl('processed');
      objectUrlsRef.current.processed = url;
      setProcessedAudioUrl(url);
    } catch (error) {
      console.error('Error exporting audio:', error);
      alert('Error exporting audio. Please try again.');
    }
  };

  return (
    <div className="min-h-screen page-bg text-white p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto glass-card rounded-2xl p-6 shadow-2xl space-y-10"
      >
        <div className="text-center">
          <h1 className="text-4xl font-bold gradient-title">
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
          {/* The gradient is a full literal on purpose: Tailwind only generates
              the classes it can find as whole strings, so
              `from-${option.from}` would produce a button with no start colour. */}
          {[
            { value: 'normal', label: 'Normal', gradient: 'from-gray-600 to-gray-800' },
            { value: 'pitchUp', label: 'Pitch Up', gradient: 'from-blue-500 to-indigo-600' },
            { value: 'pitchDown', label: 'Pitch Down', gradient: 'from-yellow-400 to-yellow-600' },
            { value: 'robot', label: 'Robot', gradient: 'from-red-500 to-pink-600' },
            { value: 'echo', label: 'Echo', gradient: 'from-green-500 to-emerald-600' },
            { value: 'reverb', label: 'Reverb', gradient: 'from-purple-500 to-violet-600' }
          ].map(option => (
            <button
              key={option.value}
              onClick={() => setEffect(option.value)}
              className={`px-4 py-3 rounded-lg text-white bg-gradient-to-r ${option.gradient} ${effect === option.value ? 'ring-2 ring-white scale-105' : ''}`}
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