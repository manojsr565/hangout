// API Configuration
const getApiBaseUrl = () => {
  // Force production URL for deployed app
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return 'https://hangout-fnc.azurewebsites.net/api';
  }
  // Use environment variable or fallback to production URL
  return import.meta.env.VITE_API_BASE_URL || 'https://hangout-fnc.azurewebsites.net/api';
};

export const API_CONFIG = {
  baseUrl: getApiBaseUrl(),
  endpoints: {
    submitPlan: '/submitplan'
  },
  timeout: 10000, // 10 seconds
};

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  details?: any;
}

export interface SubmissionResponse {
  success: boolean;
  message: string;
  submissionId: string;
  submittedAt: string;
  emailSent: boolean;
}