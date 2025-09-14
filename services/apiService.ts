import { API_CONFIG, ApiResponse, SubmissionResponse } from '../config/api';
import { PlanDetails } from '../types';

export interface PlanSubmissionPayload {
  name: string;
  date: string; // ISO date string
  time: string;
  activities: string[];
  customActivity?: string;
  submittedAt: string; // ISO timestamp
}

// Helper function to convert 12-hour format to 24-hour format
function convertTo24Hour(time12h: string): string {
  const [time, modifier] = time12h.split(' ');
  let [hours, minutes] = time.split(':');
  
  if (hours === '12') {
    hours = '00';
  }
  
  if (modifier === 'PM') {
    hours = (parseInt(hours, 10) + 12).toString();
  }
  
  return `${hours.padStart(2, '0')}:${minutes}`;
}

export class ApiService {
  private static async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_CONFIG.baseUrl}${endpoint}`;

    console.log('Making request to:', url);

    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    };

    console.log('Request options:', defaultOptions);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

      const response = await fetch(url, {
        ...defaultOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        console.log('API Error Response:', data);
        console.log('Response Status:', response.status);
        console.log('Full Error Details:', data.details);
        return {
          success: false,
          message: data.message || 'Request failed',
          error: data.error || 'Unknown error',
          details: data.details,
        };
      }

      return {
        success: true,
        message: data.message || 'Success',
        data,
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            message: 'Request timed out',
            error: 'timeout',
          };
        }

        return {
          success: false,
          message: 'Network error occurred',
          error: error.message,
        };
      }

      return {
        success: false,
        message: 'An unexpected error occurred',
        error: 'unknown',
      };
    }
  }

  static async submitPlan(planDetails: PlanDetails): Promise<ApiResponse<SubmissionResponse>> {
    // Convert time format for API compatibility
    let timeForApi = planDetails.time;
    console.log('Original time:', timeForApi);
    
    if (timeForApi === 'Anytime') {
      timeForApi = '12:00'; // Convert "Anytime" to a valid HH:MM format
    } else if (timeForApi.includes('PM') || timeForApi.includes('AM')) {
      // Convert 12-hour format to 24-hour format
      timeForApi = convertTo24Hour(timeForApi);
    }
    
    console.log('Converted time:', timeForApi);

    // Convert PlanDetails to the expected API format
    const payload: PlanSubmissionPayload = {
      name: planDetails.name,
      date: planDetails.date ? planDetails.date.toISOString() : new Date().toISOString(),
      time: timeForApi,
      activities: planDetails.activities,
      customActivity: planDetails.customActivity || undefined,
      submittedAt: new Date().toISOString(),
    };

    console.log('API Config:', API_CONFIG);
    console.log('Submitting to:', `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.submitPlan}`);
    console.log('Payload:', payload);

    return this.makeRequest<SubmissionResponse>(API_CONFIG.endpoints.submitPlan, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}