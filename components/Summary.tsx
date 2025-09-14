import React from 'react';
import type { PlanDetails } from '../types';
import { ACTIVITIES } from '../constants';
import { GiftIcon, LightbulbIcon } from './icons';

interface SummaryProps {
  planDetails: PlanDetails;
  onConfirm: () => void;
  onEdit: () => void;
}

export const Summary: React.FC<SummaryProps> = ({ planDetails, onConfirm, onEdit }) => {

  const renderActivities = () => {
    if (planDetails.customActivity) {
      return (
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-full shadow-sm text-purple-600">
          <LightbulbIcon />
          <span className="font-semibold">{planDetails.customActivity}</span>
        </div>
      );
    }

    if (planDetails.activities.includes('surprise-me')) {
      return (
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-full shadow-sm text-orange-600">
          <GiftIcon />
          <span className="font-semibold">A wonderful surprise!</span>
        </div>
      );
    }
    
    const selectedActivities = ACTIVITIES.filter(a => planDetails.activities.includes(a.id));

    return selectedActivities.map(activity => (
      <div key={activity.id} className="flex items-center gap-2 bg-white px-3 py-2 rounded-full shadow-sm text-pink-600">
        {activity.icon}
        <span className="font-semibold">{activity.name}</span>
      </div>
    ));
  };


  return (
    <div className="w-full max-w-lg mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg text-center">
      <h2 className="text-3xl font-bold text-pink-500 mb-4">Our Perfect Date Plan!</h2>
      <p className="text-gray-600 mb-6">Here's what we've got. Does this look good, {planDetails.name}?</p>
      
      <div className="text-left bg-pink-50 p-6 rounded-lg shadow-inner space-y-4">
        <div>
          <h3 className="font-semibold text-gray-500 text-sm">DATE</h3>
          <p className="text-lg text-gray-800">{planDetails.date?.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div>
          <h3 className="font-semibold text-gray-500 text-sm">TIME</h3>
          <p className="text-lg text-gray-800">{planDetails.time}</p>
        </div>
        <div>
          <h3 className="font-semibold text-gray-500 text-sm">ACTIVITIES</h3>
          <div className="flex flex-wrap gap-4 mt-2">
            {renderActivities()}
          </div>
        </div>
      </div>
      
      <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
        <button 
          onClick={onConfirm}
          className="bg-gradient-to-r from-green-400 to-blue-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
        >
          Yes, it's a plan!
        </button>
        <button 
          onClick={onEdit}
          className="bg-gray-200 text-gray-700 font-bold py-3 px-8 rounded-lg hover:bg-gray-300 transition-colors duration-200"
        >
          Let's change something
        </button>
      </div>
    </div>
  );
};