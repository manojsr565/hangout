import type { ReactElement } from 'react';

export enum Step {
  INITIAL,
  PLANNING,
  SUMMARY,
  CONFIRMED,
  REJECTED,
  MAYBE,
}

export enum SubmissionStatus {
  IDLE = 'idle',
  SUBMITTING = 'submitting',
  SUCCESS = 'success',
  ERROR = 'error',
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

export interface SubmissionState {
  status: SubmissionStatus;
  message?: string;
  submissionId?: string;
  emailSent?: boolean;
  error?: string;
}