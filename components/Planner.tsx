import React, { useState } from 'react';
import type { PlanDetails } from '../types';
import { ACTIVITIES } from '../constants';
import { GiftIcon } from './icons';

interface PlannerProps {
  onComplete: (details: PlanDetails) => void;
}

const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
};

const SUGGESTED_TIMES = ['12:00 PM', '3:00 PM', '7:00 PM', 'Anytime'];

export const Planner: React.FC<PlannerProps> = ({ onComplete }) => {
  const [details, setDetails] = useState<PlanDetails>({
    date: null,
    time: '',
    name: '',
    activities: [],
    customActivity: '',
  });
  
  const [displayDate, setDisplayDate] = useState(new Date());
  const [customTimeValue, setCustomTimeValue] = useState(() => {
    const defaultTime = new Date();
    defaultTime.setHours(12, 0, 0, 0); // Start at noon
    return defaultTime;
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to midnight to compare dates correctly

  const displayMonth = displayDate.getMonth();
  const displayYear = displayDate.getFullYear();

  const daysInMonth = getDaysInMonth(displayMonth, displayYear);
  const firstDay = getFirstDayOfMonth(displayMonth, displayYear);
  
  const handlePrevMonth = () => {
    setDisplayDate(current => {
        const newDate = new Date(current);
        newDate.setMonth(newDate.getMonth() - 1);
        return newDate;
    });
  };

  const handleNextMonth = () => {
      setDisplayDate(current => {
          const newDate = new Date(current);
          newDate.setMonth(newDate.getMonth() + 1);
          return newDate;
      });
  };

  const isPrevMonthDisabled = displayYear === today.getFullYear() && displayMonth === today.getMonth();

  const handleDateSelect = (day: number) => {
    const selectedDate = new Date(displayYear, displayMonth, day);
     if (selectedDate >= today) {
        setDetails(d => ({ ...d, date: selectedDate }));
    }
  };

  const handleTimeSelect = (time: string) => {
    setDetails(d => ({ ...d, time }));
  };
  
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDetails(d => ({ ...d, name: e.target.value }));
  };

  const handleActivityToggle = (activityId: string) => {
    setDetails(d => {
      const isSurprise = activityId === 'surprise-me';
      const currentActivities = d.activities;
      let newActivities: string[];

      if (isSurprise) {
          // If 'surprise-me' is already selected, unselect it. Otherwise, select only 'surprise-me'.
          newActivities = currentActivities.includes('surprise-me') ? [] : ['surprise-me'];
      } else {
          // It's a regular activity. If 'surprise-me' was selected, replace it.
          const regularActivities = currentActivities.filter(id => id !== 'surprise-me');
          newActivities = regularActivities.includes(activityId)
              ? regularActivities.filter(id => id !== activityId) // Toggle off
              : [...regularActivities, activityId]; // Toggle on
      }
      
      return { ...d, activities: newActivities, customActivity: '' };
    });
  };

  const handleCustomActivityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDetails(d => ({
        ...d,
        customActivity: e.target.value,
        activities: [], // Clear other selections
    }));
  };
  
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formattedCustomTime = formatTime(customTimeValue);

  const handleIncrementTime = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newTime = new Date(customTimeValue.getTime() + 30 * 60000);
    setCustomTimeValue(newTime);
    handleTimeSelect(formatTime(newTime));
  };

  const handleDecrementTime = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newTime = new Date(customTimeValue.getTime() - 30 * 60000);
    setCustomTimeValue(newTime);
    handleTimeSelect(formatTime(newTime));
  };

  const isPlannerComplete = details.date && details.time && details.name.trim() && (details.activities.length > 0 || details.customActivity.trim() !== '');

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg">
      <h2 className="text-3xl font-bold text-center text-pink-500 mb-6">Let's Plan a Date!</h2>

      {/* Date Picker */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-700 mb-3">1. Pick a day</h3>
        <div className="bg-white p-4 rounded-xl shadow-md">
            <div className="flex justify-between items-center mb-4">
                <button
                  onClick={handlePrevMonth}
                  disabled={isPrevMonthDisabled}
                  className="p-2.5 rounded-full hover:bg-pink-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-110 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                  aria-label="Previous month"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <span className="text-2xl font-bold text-gray-800 tracking-wide">{displayDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                <button 
                    onClick={handleNextMonth} 
                    className="p-2.5 rounded-full hover:bg-pink-100 transition-all duration-300 transform hover:scale-110 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                    aria-label="Next month"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-sm font-bold text-gray-500">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => <div key={day}>{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-2 mt-2 place-items-center">
                {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`}></div>)}
                {Array.from({ length: daysInMonth }).map((_, day) => {
                    const dayNumber = day + 1;
                    const date = new Date(displayYear, displayMonth, dayNumber);
                    const isPast = date < today;
                    const isSelected = details.date?.toDateString() === date.toDateString();
                    const isToday = today.toDateString() === date.toDateString();

                    return (
                        <button 
                            key={dayNumber}
                            disabled={isPast}
                            onClick={() => handleDateSelect(dayNumber)}
                            className={`w-10 h-10 rounded-full transition-all duration-200 ease-in-out transform flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-pink-500 ${
                                isSelected 
                                ? 'bg-pink-500 text-white font-bold shadow-lg scale-110' 
                                : isPast 
                                ? 'text-gray-400 cursor-not-allowed' 
                                : isToday
                                ? 'bg-pink-100 text-pink-600 font-bold hover:bg-pink-200 hover:scale-110'
                                : 'text-gray-700 hover:bg-pink-100 hover:scale-110 hover:shadow-sm'
                            }`}
                        >
                            {dayNumber}
                        </button>
                    )
                })}
            </div>
        </div>
      </div>

      {/* Time Picker */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-700 mb-3">2. Choose a time</h3>
        <div className="flex flex-wrap items-center gap-2">
          {SUGGESTED_TIMES.map(time => (
            <button 
                key={time} 
                onClick={() => handleTimeSelect(time)} 
                className={`px-4 py-2 rounded-full font-semibold transition-all duration-200 ${details.time === time ? 'bg-pink-500 text-white shadow-md' : 'bg-white hover:bg-pink-100 text-gray-700'}`}
            >
              {time}
            </button>
          ))}
          <div
            onClick={() => handleTimeSelect(formattedCustomTime)}
            role="button"
            tabIndex={0}
            aria-label={`Select time ${formattedCustomTime}`}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleTimeSelect(formattedCustomTime); }}
            className={`px-4 py-2 rounded-full font-semibold transition-all duration-200 flex items-center justify-center cursor-pointer gap-3 ${details.time === formattedCustomTime ? 'bg-pink-500 text-white shadow-md' : 'bg-white hover:bg-pink-100 text-gray-700'}`}
          >
            <span>{formattedCustomTime}</span>
            <div className="flex flex-col items-center -my-1">
                <button
                    onClick={handleIncrementTime}
                    className="h-4 flex items-center justify-center rounded-full hover:bg-black/10 w-5"
                    aria-label="Increase time by 30 minutes"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg>
                </button>
                <button
                    onClick={handleDecrementTime}
                    className="h-4 flex items-center justify-center rounded-full hover:bg-black/10 w-5"
                    aria-label="Decrease time by 30 minutes"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                </button>
            </div>
          </div>
        </div>
      </div>

      {/* Name Input */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-700 mb-2">3. What's your name?</h3>
        <input 
            type="text" 
            value={details.name}
            onChange={handleNameChange}
            placeholder="Your name..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-400 focus:border-transparent transition"
        />
      </div>

      {/* Activity Picker */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-gray-700 mb-3">4. What should we do?</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {ACTIVITIES.map(activity => {
            const isSelected = details.activities.includes(activity.id);
            return (
              <button 
                  key={activity.id} 
                  onClick={() => handleActivityToggle(activity.id)} 
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-300 ease-in-out group ${
                      isSelected 
                      ? 'border-transparent bg-gradient-to-br from-purple-400 to-pink-500 text-white shadow-lg transform scale-105' 
                      : 'border-gray-200 bg-white hover:border-purple-300 hover:shadow-md hover:transform hover:-translate-y-1'
                  }`}
              >
                <span className={`mb-2 transition-transform duration-300 group-hover:scale-110 ${!isSelected ? activity.color : ''}`}>
                  {activity.icon}
                </span>
                <span className={`font-semibold ${!isSelected ? 'text-gray-700' : ''}`}>
                  {activity.name}
                </span>
              </button>
            )
          })}
            <button 
                key="surprise-me" 
                onClick={() => handleActivityToggle('surprise-me')} 
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-300 ease-in-out group ${
                    details.activities.includes('surprise-me') 
                    ? 'border-transparent bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-lg transform scale-105' 
                    : 'border-gray-200 bg-white text-gray-700 hover:border-yellow-300 hover:shadow-md hover:transform hover:-translate-y-1'
                }`}
            >
              <span className={`mb-2 transition-transform duration-300 group-hover:scale-110 ${!details.activities.includes('surprise-me') ? 'text-orange-500' : ''}`}><GiftIcon /></span>
              <span className="font-semibold">Surprise Me!</span>
            </button>
        </div>
         <div className="mt-4">
            <input
                type="text"
                placeholder="Or suggest another idea..."
                value={details.customActivity}
                onChange={handleCustomActivityChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-400 focus:border-transparent transition"
            />
        </div>
      </div>
      
      <button 
        onClick={() => onComplete(details)}
        disabled={!isPlannerComplete}
        className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        Finalize Plan
      </button>
    </div>
  );
};