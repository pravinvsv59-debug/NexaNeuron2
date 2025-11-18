import React, { useState, useRef, useEffect } from 'react';
import { UserIcon, CoinIcon } from '../constants';
import FeedbackModal from './FeedbackModal';
import { UserProfile } from '../App';

interface ProfileProps {
  user: UserProfile | null;
  onSignIn: () => void;
  onSignOut: () => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onSignIn, onSignOut }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenFeedback = () => {
    setIsOpen(false);
    setIsFeedbackModalOpen(true);
  };

  if (!user) return null;

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="flex items-center space-x-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-black focus:ring-indigo-500"
          aria-label="Open user menu"
        >
          {user.photoURL && !user.isGuest ? (
            <img
              src={user.photoURL}
              alt="User Avatar"
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500">
                <UserIcon className="w-6 h-6" />
            </div>
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 animate-fade-in-down">
            {!user.isGuest ? (
              <>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <p className="font-semibold text-gray-800 dark:text-white truncate">{user.displayName}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-300 truncate">{user.email}</p>
                  <div className="flex items-center gap-2 mt-2 bg-black/5 dark:bg-white/5 p-2 rounded-lg">
                    <CoinIcon className="w-5 h-5" />
                    <span className="font-semibold text-yellow-600 dark:text-yellow-400">{user.coins ?? 0} NexaNeuron Coins</span>
                  </div>
                </div>
                <div className="p-2 space-y-1">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-full text-left px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                    aria-label="My Profile"
                  >
                    My Profile
                  </button>
                  <button
                    onClick={handleOpenFeedback}
                    className="w-full text-left px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                  >
                    Feedback
                  </button>
                  <a
                    href="#privacy"
                    onClick={() => setIsOpen(false)}
                    className="block w-full text-left px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                  >
                    Privacy Policy
                  </a>
                  <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                  <button
                    onClick={() => {
                      onSignOut();
                      setIsOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/20 hover:text-red-700 dark:hover:text-red-300 rounded-md transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <p className="font-semibold text-gray-800 dark:text-white truncate">Welcome, Guest</p>
                    <p className="text-sm text-gray-500 dark:text-gray-300">Sign in to save your progress.</p>
                    <div className="flex items-center gap-2 mt-2 bg-black/5 dark:bg-white/5 p-2 rounded-lg">
                        <CoinIcon className="w-5 h-5" />
                        <span className="font-semibold text-yellow-600 dark:text-yellow-400">{user.coins ?? 0} NexaNeuron Coins</span>
                    </div>
                </div>
                <div className="p-2 space-y-1">
                    <button
                        onClick={() => {
                            onSignIn();
                            setIsOpen(false);
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-md transition-all shadow-md"
                    >
                        Sign In with Google
                    </button>
                    <a
                        href="#privacy"
                        onClick={() => setIsOpen(false)}
                        className="block w-full text-left px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                    >
                        Privacy Policy
                    </a>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      <FeedbackModal 
        isOpen={isFeedbackModalOpen} 
        onClose={() => setIsFeedbackModalOpen(false)}
        user={user.isGuest ? null : { uid: user.uid, email: user.email }}
      />
    </>
  );
};

export default Profile;
