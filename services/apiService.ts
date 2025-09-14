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

export class ApiService {
  private static async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_CONFIG.baseUrl}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    };

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
    // Convert PlanDetails to the expected API format
    const payload: PlanSubmissionPayload = {
      name: planDetails.name,
      date: planDetails.date ? planDetails.date.toISOString() : new Date().toISOString(),
      time: planDetails.time,
      activities: planDetails.activities,
      customActivity: planDetails.customActivity || undefined,
      submittedAt: new Date().toISOString(),
    };

    return this.makeRequest<SubmissionResponse>(API_CONFIG.endpoints.submitPlan, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}