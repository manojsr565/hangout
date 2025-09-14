// API Configuration
export const API_CONFIG = {
  // For local development, use the Azure Functions local endpoint
  // For production, this will be replaced with the actual Azure Function URL
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:7071/api',
  endpoints: {
    submitPlan: '/submitPlan'
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