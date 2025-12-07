'use client';

import React from 'react';

interface OnboardingScreenProps {
  onNext: () => void;
  onSkip: () => void;
}

export default function OnboardingScreen({ onNext, onSkip }: OnboardingScreenProps) {
  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{
        background: 'linear-gradient(to bottom right, #0a0e27, #1a1f3a, #0a0e27)'
      }}
    >
      {/* Status Bar Simulation */}
      <div className="absolute top-0 left-0 right-0 flex justify-between items-center px-6 py-3 text-white/70 text-sm">
        <span>9:41</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-2 border border-white/70 rounded-sm">
            <div className="w-3 h-1.5 bg-white/70 rounded-sm m-0.5"></div>
          </div>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M17.778 8.222c-4.296-4.296-11.26-4.296-15.556 0A1 1 0 01.808 6.808c5.076-5.076 13.308-5.076 18.384 0a1 1 0 01-1.414 1.414zM14.95 11.05a7 7 0 00-9.9 0 1 1 0 01-1.414-1.414 9 9 0 0112.728 0 1 1 0 01-1.414 1.414zM12.12 13.88a3 3 0 00-4.24 0 1 1 0 01-1.415-1.415 5 5 0 017.07 0 1 1 0 01-1.415 1.415zM9 16a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
          <div className="w-6 h-3 border border-white/70 rounded-sm">
            <div className="w-full h-full bg-white/70 rounded-sm"></div>
          </div>
        </div>
      </div>

      {/* Zentra Logo - Using ResuMatch branding */}
      <div className="mb-12 flex items-center gap-2">
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{
            background: 'linear-gradient(to bottom right, #3b82f6, #2563eb)'
          }}
        >
          <span className="text-white font-bold text-xl">R</span>
        </div>
        <span className="text-white text-2xl font-semibold">ResuMatch</span>
      </div>

      {/* Main Content */}
      <div className="max-w-md w-full text-center space-y-6">
        {/* Headline */}
        <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
          Own Your <span className="text-blue-400">Career,</span> Shape Your{' '}
          <span className="text-blue-400">Future</span>
        </h1>

        {/* Body Text */}
        <p className="text-lg text-white/70 leading-relaxed">
          From matching smart to landing wise, your dream job begins to rise.
        </p>

        {/* Navigation Dots */}
        <div className="flex justify-center gap-2 py-4">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          <div className="w-2 h-2 rounded-full bg-white/30"></div>
          <div className="w-2 h-2 rounded-full bg-white/30"></div>
        </div>

        {/* Call to Action Buttons */}
        <div className="space-y-4 pt-8">
          <button
            onClick={onNext}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-4 px-6 rounded-xl transition-colors duration-200"
          >
            Next
          </button>
          <button
            onClick={onSkip}
            className="w-full bg-transparent border border-white/20 hover:border-white/40 text-white font-semibold py-4 px-6 rounded-xl transition-colors duration-200"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}

