'use client';

import { useState } from 'react';
import OnboardingScreen from './components/OnboardingScreen';
import UploadScreen from './components/UploadScreen';

export default function Home() {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    setCurrentStep(1);
  };

  const handleSkip = () => {
    setCurrentStep(1);
  };

  const handleBack = () => {
    setCurrentStep(0);
  };

  return (
    <div 
      className="min-h-screen"
      style={{
        background: 'linear-gradient(to bottom right, #0a0e27, #1a1f3a, #0a0e27)'
      }}
    >
      {currentStep === 0 && (
        <OnboardingScreen onNext={handleNext} onSkip={handleSkip} />
      )}
      {currentStep === 1 && <UploadScreen onBack={handleBack} />}
    </div>
  );
}
