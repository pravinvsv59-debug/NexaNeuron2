import React, { useState } from 'react';
import { geminiService } from '../services/geminiService';
import { PhotoIcon, SparklesIcon } from '../constants';
import Spinner from './Spinner';


const ImageAnalyzer: React.FC = () => {
  const [prompt, setPrompt] = useState('Describe this image in detail.');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      setResult('');
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image || !prompt.trim() || loading) return;

    setLoading(true);
    setResult('');
    setError('');

    try {
      const response = await geminiService.analyzeImage(prompt, image);
      setResult(response);
    } catch (err) {
      console.error(err);
      setError('An error occurred while analyzing the image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white/60 dark:bg-gray-900/60 backdrop-blur-lg rounded-lg border border-gray-200/50 dark:border-gray-700/50 p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Image Analyzer</h2>
        <p className="text-sm text-gray-500 dark:text-gray-300">Powered by Gemini Flash</p>
      </div>
      
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="flex flex-col gap-4">
          <label htmlFor="image-upload" className="cursor-pointer">
            <div className="h-64 w-full border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg flex flex-col items-center justify-center hover:border-indigo-500 transition-colors">
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="h-full w-full object-contain rounded-lg" />
              ) : (
                <>
                  <PhotoIcon className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                  <p className="mt-2 text-gray-500 dark:text-gray-400">Click to upload an image</p>
                </>
              )}
            </div>
          </label>
          <input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          
          <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="What do you want to know about the image?"
              className="w-full h-24 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-4 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              disabled={loading || !image}
            />
            <button
              type="submit"
              disabled={loading || !image || !prompt.trim()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold rounded-full shadow-lg ring-1 ring-white/20 transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-xl active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 focus:ring-indigo-500 disabled:from-gray-500 dark:disabled:from-gray-600 disabled:to-gray-600 dark:disabled:to-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100"
            >
              {loading ? <Spinner /> : <SparklesIcon />}
              {loading ? 'Analyzing...' : 'Analyze Image'}
            </button>
          </form>
        </div>

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

export default ImageAnalyzer;
