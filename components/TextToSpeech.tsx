import React, { useState, useRef, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import { SpeakerWaveIcon, TTS_VOICES, ArrowDownTrayIcon } from '../constants';
import Spinner from './Spinner';
import { decode, decodeAudioData, pcmToWavBlob } from '../services/utils';

const VOICE_STORAGE_KEY = 'gemini-tts-voice';

const TextToSpeech: React.FC = () => {
  const [text, setText] = useState('Hello! I am Gemini. I can convert your text into speech.');
  const [selectedVoice, setSelectedVoice] = useState(() => {
    return localStorage.getItem(VOICE_STORAGE_KEY) || 'Kore';
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    localStorage.setItem(VOICE_STORAGE_KEY, selectedVoice);
  }, [selectedVoice]);

  useEffect(() => {
    // Cleanup audio URL on unmount or when component re-renders with a new URL
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || loading) return;

    // Revoke old URL if it exists
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    setLoading(true);
    setError('');

    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const audioContext = audioContextRef.current;

      const base64Audio = await geminiService.generateSpeech(text, selectedVoice);
      const decodedPcm = decode(base64Audio);

      // Create downloadable WAV blob
      const wavBlob = pcmToWavBlob(decodedPcm, 24000, 1);
      const url = URL.createObjectURL(wavBlob);
      setAudioUrl(url);

      const audioBuffer = await decodeAudioData(
        decodedPcm,
        audioContext,
        24000,
        1,
      );
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();

    } catch (err) {
      console.error(err);
      setError('An error occurred while generating speech. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white/60 dark:bg-gray-900/60 backdrop-blur-lg rounded-lg border border-gray-200/50 dark:border-gray-700/50 p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Text to Speech</h2>
        <p className="text-sm text-gray-500 dark:text-gray-300">Powered by Gemini TTS</p>
      </div>
      
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to convert to speech..."
          className="w-full flex-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-4 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          disabled={loading}
        />
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full sm:w-auto">
            <label htmlFor="voice-select" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Select Voice</label>
            <select
              id="voice-select"
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg py-3 px-4 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={loading}
            >
              {TTS_VOICES.map(voice => <option key={voice} value={voice}>{voice}</option>)}
            </select>
          </div>
          <button
            type="submit"
            disabled={loading || !text.trim()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold rounded-full shadow-lg ring-1 ring-white/20 transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-xl active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 focus:ring-indigo-500 disabled:from-gray-500 dark:disabled:from-gray-600 disabled:to-gray-600 dark:disabled:to-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100"
          >
            {loading ? <Spinner /> : <SpeakerWaveIcon />}
            {loading ? 'Generating...' : 'Generate Speech'}
          </button>
        </div>
      </form>

      {audioUrl && (
        <div className="mt-4 text-center">
          <a
            href={audioUrl}
            download={`NexaNeuron-TTS-${selectedVoice}.wav`}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-br from-green-500 to-teal-600 text-white font-semibold rounded-full shadow-lg ring-1 ring-white/20 transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-xl active:scale-95"
          >
            <ArrowDownTrayIcon />
            Download Audio
          </a>
        </div>
      )}

      {error && <p className="text-red-500 dark:text-red-400 text-center">{error}</p>}
    </div>
  );
};

export default TextToSpeech;