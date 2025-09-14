
import React from 'react';
import type { PlanDetails, SubmissionState } from '../types';
import { SubmissionStatus } from '../types';
import { LightningIcon } from './icons';

interface FinalScreenProps {
  status: 'confirmed' | 'rejected' | 'maybe';
  planDetails?: PlanDetails;
  submissionState?: SubmissionState;
  onYesFromMaybe?: () => void;
}

export const FinalScreen: React.FC<FinalScreenProps> = ({ status, planDetails, submissionState, onYesFromMaybe }) => {
  const renderSubmissionStatus = () => {
    if (!submissionState) return null;

    switch (submissionState.status) {
      case SubmissionStatus.SUBMITTING:
        return (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <p className="text-sm text-blue-700">Submitting your plan...</p>
            </div>
          </div>
        );
      
      case SubmissionStatus.SUCCESS:
        return (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700 font-medium">✅ Plan submitted successfully!</p>
            {submissionState.submissionId && (
              <p className="text-xs text-green-600 mt-1">
                Submission ID: {submissionState.submissionId}
              </p>
            )}
            {submissionState.emailSent && (
              <p className="text-xs text-green-600 mt-1">
                📧 Email notification sent!
              </p>
            )}
          </div>
        );
      
      case SubmissionStatus.ERROR:
        return (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700 font-medium">❌ Failed to submit plan</p>
            <p className="text-xs text-red-600 mt-1">
              {submissionState.message || 'An error occurred while submitting your plan'}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Don't worry, your plan details are still saved locally!
            </p>
          </div>
        );
      
      default:
        return null;
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'confirmed':
        return (
          <>
            <h1 className="text-4xl md:text-5xl font-bold text-purple-600 mb-4">It's a PLAN! ⚡</h1>
            <p className="text-lg text-gray-700 mb-6">
              Awesome! I'm excited to hang out with you, {planDetails?.name}. Let's make it epic!
            </p>
            <div className="animate-bounce">
                <LightningIcon className="w-24 h-24 text-yellow-500" />
                            {/* <div className="animate-pulse">
                <HeartIcon className="w-24 h-24 text-red-500" /> */}
            </div>
            {renderSubmissionStatus()}
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
