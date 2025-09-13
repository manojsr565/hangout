import React, { useState, useEffect } from 'react';
import type { PlanDetails } from './types';
import { Step } from './types';
import { InitialPrompt } from './components/InitialPrompt';
import { Planner } from './components/Planner';
import { Summary } from './components/Summary';
import { FinalScreen } from './components/FinalScreen';

const App: React.FC = () => {
  const [step, setStep] = useState<Step>(Step.INITIAL);
  const [planDetails, setPlanDetails] = useState<PlanDetails>({
    date: null,
    time: '',
    name: '',
    activities: [],
    customActivity: '',
  });

  useEffect(() => {
    // For demonstration, log the plan when confirmed.
    // In a real app, this is where you might send an email or save to a database.
    if (step === Step.CONFIRMED) {
      console.log("Date Plan Confirmed:", planDetails);
    }
  }, [step, planDetails]);

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
        return <FinalScreen status="confirmed" planDetails={planDetails} />;
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