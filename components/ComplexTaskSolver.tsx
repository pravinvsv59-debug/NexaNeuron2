import React, { useState } from 'react';
import { geminiService } from '../services/geminiService';
import { BrainCircuitIcon } from '../constants';
import Spinner from './Spinner';

const ComplexTaskSolver: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setResult('');
    setError('');

    try {
      const response = await geminiService.solveComplexTask(prompt);
      setResult(response);
    } catch (err) {
      console.error(err);
      setError('An error occurred while solving the task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white/60 dark:bg-gray-900/60 backdrop-blur-lg rounded-lg border border-gray-200/50 dark:border-gray-700/50 p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Complex Task Solver</h2>
        <p className="text-sm text-gray-500 dark:text-gray-300">Powered by Gemini Pro</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter a complex prompt or problem to solve..."
          className="w-full h-40 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-4 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold rounded-full shadow-lg ring-1 ring-white/20 transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-xl active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 focus:ring-indigo-500 disabled:from-gray-500 dark:disabled:from-gray-600 disabled:to-gray-600 dark:disabled:to-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100"
        >
          {loading ? <Spinner /> : <BrainCircuitIcon />}
          {loading ? 'Thinking...' : 'Solve with AI'}
        </button>
      </form>

      {error && <p className="text-red-500 dark:text-red-400 text-center">{error}</p>}
      
      {result && (
        <div className="flex-1 bg-gray-50/80 dark:bg-black/50 rounded-lg p-4 overflow-y-auto border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-2 text-indigo-600 dark:text-indigo-400">Solution:</h3>
          <div
            className="prose prose-gray dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: geminiService.formatResponse(result) }}
          />
        </div>
      )}
    </div>
  );
};

export default ComplexTaskSolver;