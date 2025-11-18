import React from 'react';

const Logo = ({ className = 'h-8', textClassName = 'text-xl', showText = true, animated = false }: { className?: string, textClassName?: string, showText?: boolean, animated?: boolean }) => (
  <div className={`flex items-center ${showText ? 'gap-2' : ''} ${className}`}>
    <svg
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      className={`h-full w-auto ${animated ? 'animate-spin-slow' : ''}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="logoIconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818cf8" /> {/* indigo-400 */}
          <stop offset="50%" stopColor="#c084fc" /> {/* purple-400 */}
          <stop offset="100%" stopColor="#67e8f9" /> {/* cyan-300 */}
        </linearGradient>
      </defs>
      <path
        d="M20,2 C30,2 38,10 38,20 C38,30 30,38 20,38 C10,38 2,30 2,20 C2,10 10,2 20,2 Z M20,6 C12,6 6,12 6,20 C6,28 12,34 20,34 C28,34 34,28 34,20 C34,12 28,6 20,6 Z"
        fill="url(#logoIconGradient)"
      />
      <circle cx="20" cy="20" r="4" fill="white" />
      <path d="M20 16 V 8" stroke="url(#logoIconGradient)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M20 24 V 32" stroke="url(#logoIconGradient)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M16 20 H 8" stroke="url(#logoIconGradient)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M24 20 H 32" stroke="url(#logoIconGradient)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M25.6 14.4 L 29.9 10.1" stroke="url(#logoIconGradient)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M14.4 25.6 L 10.1 29.9" stroke="url(#logoIconGradient)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M25.6 25.6 L 29.9 29.9" stroke="url(#logoIconGradient)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M14.4 14.4 L 10.1 10.1" stroke="url(#logoIconGradient)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
    {showText && <span className={`font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-300 ${textClassName}`}>
      NexaNeuron
    </span>}
  </div>
);

export default Logo;