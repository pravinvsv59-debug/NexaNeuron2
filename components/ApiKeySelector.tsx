import React from 'react';

interface ApiKeySelectorProps {
  onKeySelected: () => void;
}

const ApiKeySelector: React.FC<ApiKeySelectorProps> = ({ onKeySelected }) => {
  const handleSelectKey = async () => {
    // FIX: The 'declare' keyword cannot be used inside a function block.
    // Cast window to 'any' to access the aistudio property without TypeScript errors.
    if (typeof (window as any).aistudio?.openSelectKey === 'function') {
      try {
        await (window as any).aistudio.openSelectKey();
        // Assume key selection is successful and call the callback
        onKeySelected();
      } catch (error) {
        console.error("Error opening API key selector:", error);
      }
    } else {
      console.error("aistudio.openSelectKey function not found.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-50 dark:bg-gray-900 rounded-lg p-8 text-center border border-gray-200 dark:border-gray-700">
      <svg className="w-16 h-16 text-yellow-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">API Key Required</h2>
      <p className="text-gray-500 dark:text-gray-300 mb-6 max-w-md">
        To use the video generation features (Veo), you need to select an API key. This will be used for billing purposes.
      </p>
      <button
        onClick={handleSelectKey}
        className="px-8 py-3 bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold rounded-full shadow-lg ring-1 ring-white/20 transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-xl active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-900 focus:ring-indigo-500"
      >
        Select API Key
      </button>
      <a
        href="https://ai.google.dev/gemini-api/docs/billing"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 text-sm text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300"
      >
        Learn more about billing
      </a>
    </div>
  );
};

export default ApiKeySelector;