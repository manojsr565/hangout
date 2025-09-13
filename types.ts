import type { ReactElement } from 'react';

export enum Step {
  INITIAL,
  PLANNING,
  SUMMARY,
  CONFIRMED,
  REJECTED,
  MAYBE,
}

export interface Activity {
  id: string;
  name: string;
  icon: ReactElement;
  color: string;
}

export interface PlanDetails {
  date: Date | null;
  time: string;
  name: string;
  activities: string[];
  customActivity: string;
}