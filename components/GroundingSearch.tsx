import React, { useState, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import { SearchIcon, MapPinIcon } from '../constants';
import Spinner from './Spinner';
import { GroundingSource } from '../types';


const GroundingSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [useMaps, setUseMaps] = useState(false);
  const [result, setResult] = useState<{ text: string; sources: GroundingSource[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (useMaps && !location) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (err) => {
          console.warn('Could not get location:', err.message);
          setError('Could not get your location. Maps grounding may be less accurate.');
        }
      );
    }
  }, [useMaps, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setResult(null);
    setError('');

    try {
      const response = await geminiService.groundedSearch(query, useMaps, location);
      setResult(response);
    } catch (err) {
      console.error(err);
      setError('An error occurred during the search. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white/60 dark:bg-gray-900/60 backdrop-blur-lg rounded-lg border border-gray-200/50 dark:border-gray-700/50 p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Grounded Search</h2>
        <p className="text-sm text-gray-500 dark:text-gray-300">Get up-to-date answers from Google Search & Maps</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a question..."
            className="flex-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-full py-3 px-5 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full shadow-lg ring-1 ring-white/20 transition-all duration-300 ease-in-out transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 focus:ring-indigo-500 disabled:from-gray-500 dark:disabled:from-gray-600 disabled:to-gray-600 dark:disabled:to-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100"
          >
            {loading ? <Spinner size="sm" /> : <SearchIcon />}
          </button>
        </div>
        <div className="flex items-center justify-center">
          <label className="flex items-center gap-2 cursor-pointer text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={useMaps}
              onChange={(e) => setUseMaps(e.target.checked)}
              className="form-checkbox h-5 w-5 text-indigo-600 bg-gray-200 dark:bg-gray-800 border-gray-300 dark:border-gray-700 rounded focus:ring-indigo-500"
            />
            Use Google Maps (requires location)
            <MapPinIcon className="w-5 h-5" />
          </label>
        </div>
      </form>

      {error && <p className="text-red-500 dark:text-red-400 text-center">{error}</p>}
      
      {result && (
        <div className="flex-1 bg-gray-50/80 dark:bg-black/50 rounded-lg p-4 overflow-y-auto border border-gray-200 dark:border-gray-700 space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2 text-indigo-600 dark:text-indigo-400">Answer:</h3>
            <div
              className="prose prose-gray dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: geminiService.formatResponse(result.text) }}
            />
          </div>
          {result.sources.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2 text-indigo-600 dark:text-indigo-400">Sources:</h3>
              <ul className="space-y-2">
                {result.sources.map((source, index) => (
                  <li key={index} className="truncate">
                    <a
                      href={source.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {source.title || source.uri}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GroundingSearch;