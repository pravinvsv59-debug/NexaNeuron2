import React, { useState } from 'react';
import { geminiService } from '../services/geminiService';
import { FilmIcon, SparklesIcon } from '../constants';
import Spinner from './Spinner';

const VideoAnalyzer: React.FC = () => {
  const [analysisMode, setAnalysisMode] = useState<'upload' | 'url'>('upload');
  const [prompt, setPrompt] = useState('Summarize this video.');
  const [video, setVideo] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);

  const cleanupPreview = () => {
    if (videoPreview && videoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(videoPreview);
    }
  };

  const resetStateForModeChange = () => {
    cleanupPreview();
    setVideo(null);
    setVideoUrl('');
    setVideoPreview(null);
    setResult('');
    setError('');
    setProgress(0);
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      resetStateForModeChange();
      setVideo(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    resetStateForModeChange();
    setVideoUrl(url);
    if (url.trim()) {
      setVideoPreview(url);
    }
  };
  
  const handleModeChange = (mode: 'upload' | 'url') => {
    resetStateForModeChange();
    setAnalysisMode(mode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const videoSource = analysisMode === 'upload' ? video : videoUrl;
    if (!videoSource || !prompt.trim() || loading) return;

    setLoading(true);
    setResult('');
    setError('');
    setProgress(0);

    try {
      const response = await geminiService.analyzeVideo(prompt, videoSource, (p) => setProgress(p));
      setResult(response);
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An error occurred while analyzing the video. Please try again.');
      }
    } finally {
      setLoading(false);
      setProgress(100);
    }
  };

  const isSubmitDisabled = loading || !prompt.trim() || (analysisMode === 'upload' && !video) || (analysisMode === 'url' && !videoUrl.trim());

  return (
    <div className="flex flex-col h-full bg-white/60 dark:bg-gray-900/60 backdrop-blur-lg rounded-lg border border-gray-200/50 dark:border-gray-700/50 p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Video Analyzer</h2>
        <p className="text-sm text-gray-500 dark:text-gray-300">Powered by Gemini Pro</p>
      </div>
      
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="h-64 w-full border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg flex flex-col items-center justify-center bg-gray-100/80 dark:bg-black/50">
            {videoPreview ? (
                <video key={videoPreview} src={videoPreview} className="h-full w-full object-contain rounded-lg" controls crossOrigin="anonymous"/>
            ) : (
                <>
                    <FilmIcon className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                    <p className="mt-2 text-gray-500 dark:text-gray-400 text-center">Upload a video or enter a URL below</p>
                </>
            )}
          </div>

          <div className="flex bg-gray-200 dark:bg-gray-800 rounded-full p-1 border border-gray-300 dark:border-gray-700">
            <button type="button" onClick={() => handleModeChange('upload')} className={`flex-1 px-4 py-2 text-sm font-semibold rounded-full transition-all duration-300 ${analysisMode === 'upload' ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'}`}>Upload Video</button>
            <button type="button" onClick={() => handleModeChange('url')} className={`flex-1 px-4 py-2 text-sm font-semibold rounded-full transition-all duration-300 ${analysisMode === 'url' ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'}`}>From URL</button>
          </div>

          {analysisMode === 'upload' ? (
              <div>
                  <label htmlFor="video-upload" className="cursor-pointer bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white text-center p-3 rounded-full w-full block hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors shadow-md ring-1 ring-black/5 dark:ring-white/10">Choose a video file...</label>
                  <input id="video-upload" type="file" accept="video/*" className="hidden" onChange={handleVideoChange} />
              </div>
          ) : (
              <div className="flex flex-col gap-2">
                <input type="url" value={videoUrl} onChange={handleUrlChange} placeholder="Enter public video URL..." className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" disabled={loading}/>
                <p className="text-xs text-gray-500 dark:text-gray-500 px-1">Note: May fail due to web security (CORS) restrictions.</p>
            </div>
          )}
          
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="What do you want to know about the video?"
            className="w-full h-24 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-4 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            disabled={loading}
          />
          {loading && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
            </div>
          )}
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold rounded-full shadow-lg ring-1 ring-white/20 transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-xl active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 focus:ring-indigo-500 disabled:from-gray-500 dark:disabled:from-gray-600 disabled:to-gray-600 dark:disabled:to-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100"
          >
            {loading ? <Spinner /> : <SparklesIcon />}
            {loading ? 'Analyzing...' : 'Analyze Video'}
          </button>
        </form>

        <div className="h-full min-h-[300px] lg:h-auto bg-gray-50/80 dark:bg-black/50 rounded-lg p-4 overflow-y-auto border border-gray-200/50 dark:border-gray-700/50">
          <h3 className="text-lg font-semibold mb-2 text-indigo-600 dark:text-indigo-400">Analysis:</h3>
          {error && <p className="text-red-500 dark:text-red-400">{error}</p>}
          {result ? (
            <div
              className="prose prose-gray dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: geminiService.formatResponse(result) }}
            />
          ) : (
            !loading && <p className="text-gray-500 dark:text-gray-500">Analysis results will appear here.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoAnalyzer;