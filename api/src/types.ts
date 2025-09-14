export interface PlanSubmission {
  name: string;
  date: string; // ISO date string
  time: string;
  activities: string[];
  customActivity?: string;
  submittedAt: string; // ISO timestamp
  userAgent?: string;
  ipAddress?: string; // For basic analytics
}

export interface EmailNotification {
  to: string;
  subject: string;
  htmlContent: string;
  planDetails: PlanSubmission;
}

export interface ValidationError {
  field: string;
  message: string;
}