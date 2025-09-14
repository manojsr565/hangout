import { PlanSubmission, ValidationError } from './types';

export function validatePlanSubmission(data: any): { isValid: boolean; errors: ValidationError[]; sanitized?: PlanSubmission } {
  const errors: ValidationError[] = [];

  // Check if data exists
  if (!data || typeof data !== 'object') {
    errors.push({ field: 'body', message: 'Request body is required and must be an object' });
    return { isValid: false, errors };
  }

  // Check for suspicious patterns that might indicate malicious input
  const dataString = JSON.stringify(data);
  const suspiciousPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /eval\s*\(/gi,
    /expression\s*\(/gi,
    /vbscript:/gi,
    /data:text\/html/gi
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(dataString)) {
      errors.push({ field: 'body', message: 'Request contains potentially malicious content' });
      return { isValid: false, errors };
    }
  }

  // Check payload size (prevent large payloads)
  if (dataString.length > 10000) { // 10KB limit
    errors.push({ field: 'body', message: 'Request payload too large' });
    return { isValid: false, errors };
  }

  // Validate name
  if (!data.name || typeof data.name !== 'string') {
    errors.push({ field: 'name', message: 'Name is required and must be a string' });
  } else if (data.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Name cannot be empty' });
  } else if (data.name.length > 100) {
    errors.push({ field: 'name', message: 'Name must be less than 100 characters' });
  } else if (!/^[a-zA-Z0-9\s\-'.,]+$/.test(data.name)) {
    errors.push({ field: 'name', message: 'Name contains invalid characters' });
  }

  // Validate date
  if (!data.date || typeof data.date !== 'string') {
    errors.push({ field: 'date', message: 'Date is required and must be a string' });
  } else {
    const dateObj = new Date(data.date);
    if (isNaN(dateObj.getTime())) {
      errors.push({ field: 'date', message: 'Date must be a valid ISO date string' });
    } else {
      // Check if date is not too far in the past or future (reasonable range)
      const now = new Date();
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      
      if (dateObj < oneYearAgo || dateObj > oneYearFromNow) {
        errors.push({ field: 'date', message: 'Date must be within a reasonable range (past year to next year)' });
      }
    }
  }

  // Validate time
  if (!data.time || typeof data.time !== 'string') {
    errors.push({ field: 'time', message: 'Time is required and must be a string' });
  } else if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(data.time)) {
    errors.push({ field: 'time', message: 'Time must be in HH:MM format' });
  }

  // Validate activities
  if (!Array.isArray(data.activities)) {
    errors.push({ field: 'activities', message: 'Activities must be an array' });
  } else if (data.activities.length === 0) {
    errors.push({ field: 'activities', message: 'At least one activity is required' });
  } else if (data.activities.length > 20) {
    errors.push({ field: 'activities', message: 'Too many activities (maximum 20 allowed)' });
  } else {
    const invalidActivities = data.activities.filter((activity: any) => 
      typeof activity !== 'string' || 
      activity.trim().length === 0 ||
      activity.length > 100 ||
      !/^[a-zA-Z0-9\s\-'.,!?()&:]+$/.test(activity)
    );
    if (invalidActivities.length > 0) {
      errors.push({ field: 'activities', message: 'All activities must be valid strings (max 100 chars, alphanumeric and basic punctuation only)' });
    }
  }

  // Validate customActivity (optional)
  if (data.customActivity !== undefined && data.customActivity !== null) {
    if (typeof data.customActivity !== 'string') {
      errors.push({ field: 'customActivity', message: 'Custom activity must be a string' });
    } else if (data.customActivity.length > 200) {
      errors.push({ field: 'customActivity', message: 'Custom activity must be less than 200 characters' });
    } else if (data.customActivity.trim().length > 0 && !/^[a-zA-Z0-9\s\-'.,!?()&:]+$/.test(data.customActivity)) {
      errors.push({ field: 'customActivity', message: 'Custom activity contains invalid characters' });
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // Sanitize the data
  const sanitized: PlanSubmission = {
    name: sanitizeString(data.name),
    date: data.date,
    time: data.time,
    activities: data.activities.map((activity: string) => sanitizeString(activity)),
    customActivity: data.customActivity ? sanitizeString(data.customActivity) : undefined,
    submittedAt: new Date().toISOString(),
    userAgent: data.userAgent ? sanitizeString(data.userAgent) : undefined,
    ipAddress: data.ipAddress ? sanitizeString(data.ipAddress) : undefined
  };

  return { isValid: true, errors: [], sanitized };
}

function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/[\r\n\t]/g, ' ') // Replace line breaks and tabs with spaces
    .replace(/\s+/g, ' ') // Normalize multiple spaces
    .replace(/[^\w\s\-'.,!?()&:]/g, '') // Remove any characters not in allowed set
    .substring(0, 500); // Ensure maximum length as additional safety
}