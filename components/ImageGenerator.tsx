import React, { useState } from 'react';
import { geminiService } from '../services/geminiService';
import { AspectRatio } from '../types';
import { SparklesIcon, PhotoIcon, ArrowDownTrayIcon, LEGACY_STYLES } from '../constants';
import Spinner from './Spinner';
import { UserProfile } from '../App';
import { db } from '../firebase';
import { doc, increment, updateDoc } from 'firebase/firestore';

interface ImageGeneratorProps {
  user: UserProfile | null;
  onUpdateCoins: (newBalance: number) => void;
}

const aspectRatios: AspectRatio[] = ["1:1", "16:9", "9:16", "4:3", "3:4"];
const IMAGE_COST = 5;

const ImageGenerator: React.FC<ImageGeneratorProps> = ({ user, onUpdateCoins }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [legacy, setLegacy] = useState<string>('Default');
  const [numberOfImages, setNumberOfImages] = useState(4);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const isPremium = user?.isPremium ?? false;
  const hasEnoughCoins = user ? (isPremium || (user.coins ?? 0) >= IMAGE_COST) : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading || !user) return;
    
    if (!hasEnoughCoins) {
        setError(`You need at least ${IMAGE_COST} coins to generate images. You have ${user.coins ?? 0}.`);
        return;
    }

    setLoading(true);
    setImages([]);
    setError('');

    try {
      const finalPrompt = legacy !== 'Default' ? `${prompt}, style: ${legacy}` : prompt;
      const imageUrls = await geminiService.generateImage(finalPrompt, aspectRatio, numberOfImages);
      setImages(imageUrls);
      
      if (!isPremium) {
        const newBalance = (user.coins ?? 0) - IMAGE_COST;

        // Deduct coins on success - only update Firestore for real users
        if (!user.isGuest) {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
              coins: increment(-IMAGE_COST)
          });
        }
        onUpdateCoins(newBalance);
      }

    } catch (err) {
      console.error(err);
      setError('An error occurred while generating the images. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white/60 dark:bg-gray-900/60 backdrop-blur-lg rounded-lg border border-gray-200/50 dark:border-gray-700/50 p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Image Generator</h2>
        <p className="text-sm text-gray-500 dark:text-gray-300">Powered by Imagen 4</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 bg-gray-100/80 dark:bg-black/50 rounded-lg border border-gray-200/50 dark:border-gray-700/50 min-h-[300px] overflow-y-auto">
        {loading && <Spinner size='lg' />}
        {!loading && images.length > 0 && (
          <div className="grid grid-cols-2 gap-4 w-full">
            {images.map((imgSrc, index) => (
              <div key={index} className="relative group bg-gray-200 dark:bg-gray-900 rounded-lg overflow-hidden">
                <img src={imgSrc} alt={`Generated variant ${index + 1}`} className="w-full h-full object-contain" />
                <a
                  href={imgSrc}
                  download={`generated-image-variant-${index + 1}.jpeg`}
                  className="absolute bottom-2 right-2 p-2 bg-green-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  aria-label={`Download variant ${index + 1}`}
                >
                  <ArrowDownTrayIcon className="w-5 h-5" />
                </a>
              </div>
            ))}
          </div>
        )}
        {!loading && images.length === 0 && <PhotoIcon className="w-24 h-24 text-gray-400 dark:text-gray-600" />}
        {error && <p className="text-red-500 dark:text-red-400 mt-4 text-center">{error}</p>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={`Enter a prompt to generate ${numberOfImages} image variant${numberOfImages > 1 ? 's' : ''}...`}
          className="w-full h-24 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-4 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          disabled={loading}
        />
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
            <label htmlFor="num-images" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Variants ({numberOfImages})</label>
             <input
              id="num-images"
              type="range"
              min="1"
              max="10"
              step="1"
              value={numberOfImages}
              onChange={(e) => setNumberOfImages(Number(e.target.value))}
              className="w-full h-2 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              disabled={loading}
            />
          </div>
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Aspect Ratio</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {aspectRatios.map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => setAspectRatio(ratio)}
                  className={`py-2 px-1 sm:px-4 rounded-full text-sm font-semibold transition-all duration-200 shadow-md transform hover:scale-105 ${
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
              disabled={loading || !prompt.trim() || !user || !hasEnoughCoins}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold rounded-full shadow-lg ring-1 ring-white/20 transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-xl active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 focus:ring-indigo-500 disabled:from-gray-500 dark:disabled:from-gray-600 disabled:to-gray-600 dark:disabled:to-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100"
            >
              <SparklesIcon />
              {loading ? 'Generating...' : (isPremium ? 'Generate' : `Generate (${IMAGE_COST} Coins)`)}
            </button>
        </div>
      </form>
    </div>
  );
};

export default ImageGenerator;