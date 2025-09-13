
import React from 'react';
import { ArcadeIcon, BoardGamesIcon, CoffeeIcon, DinnerIcon, GameIcon, KaraokeIcon, MovieIcon, OutdoorActivityIcon, ParkIcon, PicnicIcon, StargazingIcon } from './components/icons';
import type { Activity } from './types';

export const ACTIVITIES: Activity[] = [
  { id: 'movie', name: 'Movie', icon: <MovieIcon />, color: 'text-red-500' },
  { id: 'dinner', name: 'Dinner', icon: <DinnerIcon />, color: 'text-orange-500' },
  { id: 'arcade', name: 'Arcade', icon: <ArcadeIcon />, color: 'text-indigo-500' },
  { id: 'game', name: 'Game Night', icon: <GameIcon />, color: 'text-blue-500' },
  { id: 'coffee', name: 'Coffee', icon: <CoffeeIcon />, color: 'text-yellow-800' },
  { id: 'park', name: 'Walk in Park', icon: <ParkIcon />, color: 'text-green-500' },
  { id: 'picnic', name: 'Picnic', icon: <PicnicIcon />, color: 'text-lime-600' },
  { id: 'stargazing', name: 'Stargazing', icon: <StargazingIcon />, color: 'text-purple-500' },
  { id: 'boardgames', name: 'Board Games', icon: <BoardGamesIcon />, color: 'text-teal-500' },
  { id: 'karaoke', name: 'Karaoke', icon: <KaraokeIcon />, color: 'text-pink-500' },
  { id: 'outdoor', name: 'Outdoor Activity', icon: <OutdoorActivityIcon />, color: 'text-cyan-500' },
];

export const NO_BUTTON_PHRASES = [
    "No",
    "Are you sure?",
    "Really sure?",
    "Please reconsider :(",
    "Don't do this to me",
    "I'm gonna cry...",
    "Okay, last chance!",
    "You're breaking my heart ;(",
];