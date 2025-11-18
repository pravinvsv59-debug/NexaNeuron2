import React, { useState, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import { FilmIcon, PhotoIcon, ArrowDownTrayIcon, SpeakerWaveIcon, LEGACY_STYLES } from '../constants';
import Spinner from './Spinner';
import { TTS_VOICES } from '../constants';
import { UserProfile } from '../App';
import { db } from '../firebase';
import { doc, increment, updateDoc } from 'firebase/firestore';

type GenerationMode = 'text-to-video' | 'image-to-video';
type VideoAspectRatio = "16:9" | "9:16";
type AudioMode = 'none' | 'upload' | 'tts';

const loadingMessages = [
    "Warming up the digital director's chair...",
    "Casting pixels for their roles...",
    "Storyboarding the digital narrative...",
    "Rendering the first few frames...",
    "The AI is checking the lighting...",
    "Composing the digital symphony...",
    "This is taking a moment, great things are coming...",
    "Finalizing the special effects...",
    "Almost ready for the premiere...",
];

interface VideoGeneratorProps {
  user: UserProfile | null;
  onUpdateCoins: (newBalance: number) => void;
}

const VIDEO_COST = 20;

const VideoGenerator: React.FC<VideoGeneratorProps> = ({ user, onUpdateCoins }) => {
  const [mode, setMode] = useState<GenerationMode>('text-to-video');
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>("16:9");
  const [legacy, setLegacy] = useState<string>('Default');
  const [duration, setDuration] = useState(7);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');

  // API Key state
  const [hasApiKey, setHasApiKey] = useState(true);
  const [isCheckingKey, setIsCheckingKey] = useState(true);

  // Audio state
  const [audioMode, setAudioMode] = useState<AudioMode>('none');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [ttsPrompt, setTtsPrompt] = useState('');
  const [ttsVoice, setTtsVoice] = useState('Kore');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const isPremium = user?.isPremium ?? false;
  const hasEnoughCoins = user ? (isPremium || (user.coins ?? 0) >= VIDEO_COST) : false;

  const formatDuration = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toString().padStart(2, '0')}s`;
  };
  
  useEffect(() => {
    const checkKey = async () => {
        if (typeof (window as any).aistudio?.hasSelectedApiKey === 'function') {
            try {
                const hasKey = await (window as any).aistudio.hasSelectedApiKey();
                setHasApiKey(hasKey);
            } catch (e) {
                console.error("Error checking for API key", e);
                setHasApiKey(false);
            }
        }
        setIsCheckingKey(false);
    };
    checkKey();
  }, []);

  useEffect(() => {
    // Cleanup object URLs on component unmount
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (audioPreview) URL.revokeObjectURL(audioPreview);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [imagePreview, videoUrl, audioPreview, audioUrl]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAudioFile(file);
      if (audioPreview) URL.revokeObjectURL(audioPreview);
      setAudioPreview(URL.createObjectURL(file));
    }
  };
  
  const handleSelectKey = async () => {
    if (typeof (window as any).aistudio?.openSelectKey === 'function') {
        try {
            await (window as any).aistudio.openSelectKey();
            setHasApiKey(true);
            setError(''); // Clear previous errors
        } catch (err) {
            console.error("Error opening API key selector:", err);
            setError('Could not select API key. Please try again.');
        }
    }
  };

  const isGenerateDisabled = loading || isCheckingKey || !hasApiKey || !prompt.trim() || (mode === 'image-to-video' && !image) || !user || !hasEnoughCoins;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGenerateDisabled || !user) return;

    if (!hasEnoughCoins) {
        setError(`You need at least ${VIDEO_COST} coins to generate videos. You have ${user.coins ?? 0}.`);
        return;
    }

    setLoading(true);
    setVideoUrl(null);
    setAudioUrl(null);
    setError('');

    let messageInterval: number;
    
    // Set up loading messages
    setLoadingMessage(loadingMessages[0]);
    messageInterval = window.setInterval(() => {
        setLoadingMessage(prev => {
            const currentIndex = loadingMessages.indexOf(prev);
            const nextIndex = (currentIndex + 1) % loadingMessages.length;
            return loadingMessages[nextIndex];
        });
    }, 5000);

    const finalPrompt = legacy !== 'Default' ? `${prompt}, style: ${legacy}` : prompt;

    // Prepare audio and video generation promises
    const videoPromise = geminiService.generateVideo(finalPrompt, aspectRatio, image, duration);
    const audioPromise = (async () => {
      if (audioMode === 'upload' && audioFile) {
        return URL.createObjectURL(audioFile);
      }
      if (audioMode === 'tts' && ttsPrompt.trim()) {
        return geminiService.generateSpeechAndGetUrl(ttsPrompt, ttsVoice);
      }
      return null;
    })();

    try {
      const [generatedVideoUrl, generatedAudioUrl] = await Promise.all([videoPromise, audioPromise]);
      setVideoUrl(generatedVideoUrl);
      if (generatedAudioUrl) {
        setAudioUrl(generatedAudioUrl);
      }

      if (!isPremium) {
        const newBalance = (user.coins ?? 0) - VIDEO_COST;
        if (!user.isGuest) {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
              coins: increment(-VIDEO_COST)
          });
        }
        onUpdateCoins(newBalance);
      }

    } catch (err) {
        let errorMessage = 'An error occurred during generation.';
        if (err instanceof Error && err.message.includes('Requested entity was not found')) {
            errorMessage = 'API Key error. Please re-select your API key and try again.';
            setHasApiKey(false);
        }
        console.error(err);
        setError(errorMessage);
    } finally {
        setLoading(false);
        clearInterval(messageInterval);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white/60 dark:bg-gray-900/60 backdrop-blur-lg rounded-lg border border-gray-200/50 dark:border-gray-700/50 p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Veo Video Generator</h2>
        <p className="text-sm text-gray-500 dark:text-gray-300">Powered by Veo</p>
      </div>
      
      {!isCheckingKey && !hasApiKey && (
        <div className="bg-indigo-50 dark:bg-indigo-900/50 border border-indigo-300 dark:border-indigo-700 text-indigo-800 dark:text-indigo-200 px-4 py-3 rounded-lg relative text-center space-y-3" role="alert">
          <div>
            <strong className="font-bold">API Key Required for Veo</strong>
            <p className="text-sm">
              To use the video generation features, you need to select an API key for billing purposes.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={handleSelectKey} className="px-6 py-2 bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold rounded-full shadow-lg ring-1 ring-white/20 transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-xl active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-indigo-50 dark:focus:ring-offset-gray-900 focus:ring-indigo-500 whitespace-nowrap">
                  Select API Key
              </button>
              <a
                  href="https://ai.google.dev/gemini-api/docs/billing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
              >
                  Learn more about billing
              </a>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center p-4 bg-gray-100/80 dark:bg-black/50 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
        {loading && (
            <div className="text-center">
                <Spinner size='lg' />
                <p className="mt-4 text-gray-900 dark:text-white">{loadingMessage}</p>
                <p className="text-sm text-gray-500 dark:text-gray-300">(Video generation can take several minutes)</p>
            </div>
        )}
        {!loading && videoUrl && (
          <div className="w-full max-w-2xl mx-auto space-y-4">
            <div className="space-y-2">
                <video src={videoUrl} className="w-full object-contain rounded-lg" controls autoPlay loop/>
                <a
                    href={videoUrl}
                    download="generated-video.mp4"
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-br from-green-500 to-teal-600 text-white font-semibold rounded-full shadow-lg ring-1 ring-white/20 transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-xl active:scale-95"
                >
                    <ArrowDownTrayIcon />
                    <span>Download Video</span>
                </a>
            </div>

            {audioUrl && (
                <div className="space-y-2">
                    <audio src={audioUrl} controls className="w-full" />
                     <a
                        href={audioUrl}
                        download={`generated-audio.${audioMode === 'upload' ? audioFile?.name.split('.').pop() ?? 'mp3' : 'wav'}`}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-br from-green-500 to-teal-600 text-white font-semibold rounded-full shadow-lg ring-1 ring-white/20 transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-xl active:scale-95"
                    >
                        <ArrowDownTrayIcon />
                        <span>Download Audio</span>
                    </a>
                </div>
            )}
            
            {audioUrl && <p className="text-xs text-gray-500 dark:text-gray-500 text-center">Note: Video and audio are separate files. Download both and combine them using a video editor.</p>}
          </div>
        )}
        {!loading && !videoUrl && <FilmIcon className="w-24 h-24 text-gray-400 dark:text-gray-600" />}
        {error && <p className="text-red-500 dark:text-red-400 mt-4 text-center">{error}</p>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex justify-center bg-gray-200 dark:bg-gray-800 rounded-full p-1 border border-gray-300 dark:border-gray-700 w-full sm:w-auto mx-auto">
            <button type="button" onClick={() => setMode('text-to-video')} className={`flex-1 px-4 py-2 text-sm font-semibold rounded-full transition-all duration-300 ${mode === 'text-to-video' ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'}`}>Text-to-Video</button>
            <button type="button" onClick={() => setMode('image-to-video')} className={`flex-1 px-4 py-2 text-sm font-semibold rounded-full transition-all duration-300 ${mode === 'image-to-video' ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'}`}>Image-to-Video</button>
        </div>

        {mode === 'image-to-video' && (
          <div>
            <label htmlFor="image-upload-video" className="cursor-pointer">
              <div className="h-32 w-full border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg flex items-center justify-center hover:border-indigo-500 transition-colors">
                {imagePreview ? (
                  <img src={imagePreview} alt="Upload preview" className="h-full w-full object-contain p-2" />
                ) : (
                  <div className="text-center text-gray-500 dark:text-gray-500">
                    <PhotoIcon className="w-8 h-8 mx-auto" />
                    <p>Click to upload starting image</p>
                  </div>
                )}
              </div>
            </label>
            <input id="image-upload-video" type="file" accept="image/*" className="hidden" onChange={handleImageChange} disabled={loading} />
          </div>
        )}

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter a prompt to generate a video..."
          className="w-full h-24 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-4 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          disabled={loading}
        />
        
        {/* Audio Options */}
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Audio (Optional)</label>
            <div className="flex border border-gray-300 dark:border-gray-700 rounded-full p-1 bg-gray-200 dark:bg-gray-800 w-full">
                {(['none', 'upload', 'tts'] as const).map(m => (
                    <button type="button" key={m} onClick={() => setAudioMode(m)} className={`flex-1 py-2 px-2 rounded-full text-sm font-semibold transition-all duration-300 ${audioMode === m ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'}`}>
                        { {none: 'None', upload: 'Upload Audio', tts: 'Text-to-Speech'}[m] }
                    </button>
                ))}
            </div>
        </div>

        {audioMode === 'upload' && (
            <div>
                 <label htmlFor="audio-upload" className="cursor-pointer">
                  <div className="h-20 w-full border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg flex items-center justify-center hover:border-indigo-500 transition-colors">
                    {audioPreview ? (
                        <audio src={audioPreview} controls className="w-full p-2" />
                    ) : (
                      <div className="text-center text-gray-500 dark:text-gray-500 flex items-center gap-2">
                        <SpeakerWaveIcon /> <p>Click to upload an audio file</p>
                      </div>
                    )}
                  </div>
                </label>
                <input id="audio-upload" type="file" accept="audio/*" className="hidden" onChange={handleAudioChange} disabled={loading} />
            </div>
        )}

        {audioMode === 'tts' && (
            <div className="space-y-2">
                <textarea
                  value={ttsPrompt}
                  onChange={(e) => setTtsPrompt(e.target.value)}
                  placeholder="Enter text to generate audio..."
                  className="w-full h-20 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  disabled={loading}
                />
                 <select
                  value={ttsVoice}
                  onChange={(e) => setTtsVoice(e.target.value)}
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg py-2 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={loading}
                >
                  {TTS_VOICES.map(voice => <option key={voice} value={voice}>{voice}</option>)}
                </select>
            </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Style Legacy</label>
                <select
                  value={legacy}
                  onChange={(e) => setLegacy(e.target.value)}
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg py-3 px-4 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={loading}
                >
                  {LEGACY_STYLES.map(style => <option key={style} value={style}>{style}</option>)}
                </select>
            </div>
             <div>
                <label htmlFor="duration-slider" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                    Duration ({formatDuration(duration)})
                </label>
                <input
                    id="duration-slider"
                    type="range"
                    min="4"
                    max="600"
                    step="1"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full h-2 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 mt-4"
                    disabled={loading}
                />
            </div>
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Aspect Ratio</label>
            <div className="flex gap-2">
              {(['16:9', '9:16'] as VideoAspectRatio[]).map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => setAspectRatio(ratio)}
                  className={`flex-1 py-3 px-4 rounded-full text-sm font-semibold transition-all duration-200 shadow-md transform hover:scale-105 ${
                    aspectRatio === ratio
                      ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white ring-1 ring-white/20 shadow-lg'
                      : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {ratio}
                </button>
              ))}
            </div>
        </div>
        <div className="flex justify-end pt-2">
            <button
                type="submit"
                disabled={isGenerateDisabled}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold rounded-full shadow-lg ring-1 ring-white/20 transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-xl active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 focus:ring-indigo-500 disabled:from-gray-500 dark:disabled:from-gray-600 disabled:to-gray-600 dark:disabled:to-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100"
            >
                <FilmIcon className="w-5 h-5" />
                {loading ? 'Generating...' : (isPremium ? 'Generate Video' : `Generate Video (${VIDEO_COST} Coins)`)}
            </button>
        </div>
      </form>
    </div>
  );
};

export default VideoGenerator;