
import React, { useState } from 'react';
import { NO_BUTTON_PHRASES } from '../constants';

interface InitialPromptProps {
  onYes: () => void;
  onMaybe: () => void;
}

export const InitialPrompt: React.FC<InitialPromptProps> = ({ onYes, onMaybe }) => {
  const [noCount, setNoCount] = useState(0);

  const handleNoClick = () => {
    setNoCount((prev) => prev + 1);
  };

  const getNoButtonText = () => {
    return NO_BUTTON_PHRASES[Math.min(noCount, NO_BUTTON_PHRASES.length - 1)];
  };
  
  const yesButtonSize = 20 + noCount * 8;
  const yesButtonTextSize = 1 + noCount * 0.1;

  return (
    <div className="flex flex-col items-center justify-center text-center p-4">
      <img src="https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=200&h=200&fit=crop&crop=center" alt="romantic pier" className="w-48 h-48 rounded-full mb-8 shadow-lg object-cover" />
      <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-8">
        Would you go out with me?
      </h1>
      <div className="flex items-center gap-4">
        <button
          onClick={onYes}
          className="bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg shadow-md transition-all duration-300"
          style={{ padding: `${10 + noCount * 2}px ${20 + noCount * 4}px`, fontSize: `${yesButtonTextSize}rem` }}
        >
          Yes
        </button>
        <button
          onClick={handleNoClick}
          className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-300"
        >
          {getNoButtonText()}
        </button>
      </div>
      <button onClick={onMaybe} className="mt-6 text-gray-500 hover:text-gray-700 transition-colors">
        Maybe?
      </button>
    </div>
  );
};
