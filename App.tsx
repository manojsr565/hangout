import React, { useState, useEffect } from 'react';
import type { PlanDetails, SubmissionState } from './types';
import { Step, SubmissionStatus } from './types';
import { InitialPrompt } from './components/InitialPrompt';
import { Planner } from './components/Planner';
import { Summary } from './components/Summary';
import { FinalScreen } from './components/FinalScreen';
import { ApiService } from './services/apiService';

const App: React.FC = () => {
  const [step, setStep] = useState<Step>(Step.INITIAL);
  const [planDetails, setPlanDetails] = useState<PlanDetails>({
    date: null,
    time: '',
    name: '',
    activities: [],
    customActivity: '',
  });
  const [submissionState, setSubmissionState] = useState<SubmissionState>({
    status: SubmissionStatus.IDLE,
  });

  const handlePlanSubmission = async () => {
    setSubmissionState({ status: SubmissionStatus.SUBMITTING });
    
    try {
      const response = await ApiService.submitPlan(planDetails);
      
      if (response.success && response.data) {
        setSubmissionState({
          status: SubmissionStatus.SUCCESS,
          message: response.message,
          submissionId: response.data.submissionId,
          emailSent: response.data.emailSent,
        });
        console.log("Date Plan Submitted Successfully:", {
          submissionId: response.data.submissionId,
          emailSent: response.data.emailSent,
        });
      } else {
        setSubmissionState({
          status: SubmissionStatus.ERROR,
          message: response.message || 'Failed to submit plan',
          error: response.error,
        });
        console.error("Plan submission failed:", response);
      }
    } catch (error) {
      setSubmissionState({
        status: SubmissionStatus.ERROR,
        message: 'An unexpected error occurred',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      console.error("Plan submission error:", error);
    }
  };

  useEffect(() => {
    // Submit the plan when step changes to CONFIRMED
    if (step === Step.CONFIRMED && submissionState.status === SubmissionStatus.IDLE) {
      handlePlanSubmission();
    }
  }, [step, submissionState.status]);

  const handlePlanCompletion = (details: PlanDetails) => {
    setPlanDetails(details);
    setStep(Step.SUMMARY);
  };

  const renderStep = () => {
    switch (step) {
      case Step.INITIAL:
        return <InitialPrompt onYes={() => setStep(Step.PLANNING)} onMaybe={() => setStep(Step.MAYBE)} />;
      case Step.MAYBE:
        return <FinalScreen status="maybe" onYesFromMaybe={() => setStep(Step.PLANNING)} />;
      case Step.PLANNING:
        return <Planner onComplete={handlePlanCompletion} />;
      case Step.SUMMARY:
        return <Summary planDetails={planDetails} onConfirm={() => setStep(Step.CONFIRMED)} onEdit={() => setStep(Step.PLANNING)} />;
      case Step.CONFIRMED:
        return <FinalScreen status="confirmed" planDetails={planDetails} submissionState={submissionState} />;
      case Step.REJECTED:
        return <FinalScreen status="rejected" />;
      default:
        return <div>Something went wrong.</div>;
    }
  };

  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 flex items-center justify-center p-4 transition-all duration-500">
        <div className="w-full transition-opacity duration-500">
            {renderStep()}
        </div>
    </main>
  );
};

export default App;