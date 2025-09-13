
import React from 'react';
import type { PlanDetails } from '../types';
import { HeartIcon } from './icons';

interface FinalScreenProps {
  status: 'confirmed' | 'rejected' | 'maybe';
  planDetails?: PlanDetails;
  onYesFromMaybe?: () => void;
}

export const FinalScreen: React.FC<FinalScreenProps> = ({ status, planDetails, onYesFromMaybe }) => {
  const renderContent = () => {
    switch (status) {
      case 'confirmed':
        return (
          <>
            <h1 className="text-4xl md:text-5xl font-bold text-pink-500 mb-4">It's a DATE!</h1>
            <p className="text-lg text-gray-700 mb-6">
              Yay! I'm so excited to hang out with you, {planDetails?.name}. I'll be in touch!
            </p>
            <div className="animate-pulse">
                <HeartIcon className="w-24 h-24 text-red-500" />
            </div>
            <p className="mt-4 text-xs text-gray-400">(This is just a demo. Your response has been logged to the console!)</p>
          </>
        );
      case 'maybe':
        return (
             <>
                <img src="https://picsum.photos/seed/thinking/200/200" alt="cute thinking animal" className="w-48 h-48 rounded-full mb-8 shadow-lg" />
                <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">"Maybe" is just "Yes" in disguise!</h1>
                <p className="text-lg text-gray-600 mb-8">
                    Let's make it a definite yes. How about we plan something fun?
                </p>
                <button
                    onClick={onYesFromMaybe}
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-lg shadow-md transition-transform transform hover:scale-105"
                >
                    Okay, let's do it!
                </button>
            </>
        );
      case 'rejected':
        return (
            <>
                <img src="https://picsum.photos/seed/sad/200/200" alt="sad bear" className="w-48 h-48 rounded-full mb-8 shadow-lg" />
                <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">Oh...</h1>
                <p className="text-lg text-gray-600">That's okay, maybe next time!</p>
            </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center text-center p-4">
      {renderContent()}
    </div>
  );
};
