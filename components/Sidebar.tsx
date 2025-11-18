import React from 'react';
import { Feature } from '../types';
import { FEATURE_ICONS } from '../constants';
import Logo from './Logo';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeFeature: Feature;
  onSelectFeature: (feature: Feature) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, activeFeature, onSelectFeature }) => {
  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-gray-900/60 z-30 transition-opacity duration-300 ease-in-out ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white/60 dark:bg-gray-900/60 backdrop-blur-2xl border-r border-gray-900/10 dark:border-white/10 flex flex-col z-40 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-start p-4 md:px-6 h-20 border-b border-gray-900/10 dark:border-white/10">
          <Logo className="h-8" textClassName="text-xl" />
        </div>
        <nav className="flex-1 p-2 md:p-4 space-y-2 overflow-y-auto">
          {Object.values(Feature).map((feature) => (
            <button
              key={feature}
              onClick={() => onSelectFeature(feature)}
              className={`w-full flex items-center p-3 rounded-xl transition-all duration-300 ease-in-out transform hover:scale-105 hover:bg-black/5 dark:hover:bg-white/5 ${
                activeFeature === feature
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg ring-1 ring-black/5 dark:ring-white/20'
                  : 'text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {FEATURE_ICONS[feature]}
              <span className="ml-4 font-medium">{feature}</span>
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
