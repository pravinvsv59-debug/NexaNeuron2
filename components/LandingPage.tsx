import React, { useState, useEffect } from 'react';
import { SparklesIcon } from '../constants';
import Logo from './Logo';

interface LandingPageProps {
  onStart: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-cyan-400 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white rounded-full opacity-30"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animation: `float ${5 + Math.random() * 10}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className={`relative z-10 flex flex-col items-center justify-center min-h-screen px-6 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        
        {/* Logo Container */}
        <div className="mb-8 transform hover:scale-105 transition-transform duration-500">
          <div className="relative">
            {/* Glow Effect */}
            <div className="absolute -inset-2 bg-white rounded-3xl blur-xl opacity-50 animate-pulse"></div>
            
            {/* Logo Background */}
            <div className="relative bg-white/20 backdrop-blur-lg rounded-3xl py-6 px-10 shadow-2xl border border-white/20">
              <Logo className="h-16" textClassName="text-5xl font-extrabold tracking-tight" animated={true} />
            </div>
          </div>
        </div>

        {/* Tagline */}
        <div className="text-center mb-12">
          <h2 className="text-white text-2xl font-semibold mb-3 flex items-center justify-center gap-2">
            <SparklesIcon className="w-6 h-6 animate-pulse" />
            AI-Powered Intelligence
            <SparklesIcon className="w-6 h-6 animate-pulse" />
          </h2>
          <p className="text-white/90 text-lg">Experience the Future of Artificial Intelligence</p>
        </div>

        {/* Let's Start Button */}
        <button onClick={onStart} className="group relative px-12 py-5 bg-white text-blue-600 text-xl font-bold rounded-full shadow-2xl hover:shadow-white/50 transition-all duration-300 hover:scale-110 overflow-hidden">
          {/* Button Shine Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent transform -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
          
          <span className="relative z-10 flex items-center gap-3">
            Let's Start
            <svg className="w-6 h-6 transform group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        </button>

        {/* Features Pills */}
        <div className="flex flex-wrap justify-center gap-4 mt-12">
          {['Neural Networks', 'Deep Learning', 'Smart AI'].map((feature, idx) => (
            <div
              key={idx}
              className="px-6 py-3 bg-white/20 backdrop-blur-md rounded-full text-white font-medium border border-white/30 hover:bg-white/30 transition-all duration-300 cursor-pointer"
              style={{
                animation: `fadeInUp 0.6s ease-out ${idx * 0.2}s both`
              }}
            >
              {feature}
            </div>
          ))}
        </div>

        {/* Footer Text */}
        <div className="absolute bottom-8 text-white/70 text-sm">
          Powered by Advanced Neural Technology
        </div>
      </div>
    </div>
  );
};

export default LandingPage;