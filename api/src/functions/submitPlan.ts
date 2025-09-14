import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { validatePlanSubmission } from '../validation';
import { PlanSubmission } from '../types';
import { EmailService } from '../services/emailService';
import { Logger } from '../utils/logger';
import { submitPlanRateLimiter, globalRateLimiter } from '../utils/rateLimiter';

export async function submitPlan(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const logger = new Logger(context);
  const startTime = Date.now();

  // Set security and CORS headers
  const securityHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  };

  // Handle preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    const duration = Date.now() - startTime;
    logger.logApiRequest('/api/submitPlan', request.method, 200, duration);
    return {
      status: 200,
      headers: securityHeaders
    };
  }

  // Only allow POST requests
  if (request.method !== 'POST') {
    const duration = Date.now() - startTime;
    logger.log({
      level: 'warn',
      message: 'Method not allowed for plan submission',
      properties: {
        method: request.method,
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    });
    logger.logApiRequest('/api/submitPlan', request.method, 405, duration);
    
    return {
      status: 405,
      headers: securityHeaders,
      body: JSON.stringify({
        success: false,
        error: 'Method not allowed',
        message: 'Only POST requests are supported'
      })
    };
  }

  // Get client IP for rate limiting
  const clientIP = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   request.headers.get('x-client-ip') ||
                   'unknown';

  // Apply rate limiting
  const globalRateLimit = globalRateLimiter.isAllowed('global');
  const ipRateLimit = submitPlanRateLimiter.isAllowed(clientIP);

  if (!globalRateLimit.allowed || !ipRateLimit.allowed) {
    const duration = Date.now() - startTime;
    const rateLimitInfo = !globalRateLimit.allowed ? 'global' : 'per-ip';
    const resetTime = !globalRateLimit.allowed ? globalRateLimit.resetTime : ipRateLimit.resetTime;
    
    logger.log({
      level: 'warn',
      message: 'Rate limit exceeded',
      properties: {
        rateLimitType: rateLimitInfo,
        clientIP: clientIP,
        userAgent: request.headers.get('user-agent') || 'unknown',
        resetTime: resetTime
      }
    });
    
    logger.logApiRequest('/api/submitPlan', request.method, 429, duration);
    
    const rateLimitHeaders = {
      ...securityHeaders,
      'Retry-After': Math.ceil(((resetTime || Date.now()) - Date.now()) / 1000).toString(),
      'X-RateLimit-Limit': rateLimitInfo === 'global' ? '100' : '10',
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': Math.ceil((resetTime || Date.now()) / 1000).toString()
    };
    
    return {
      status: 429,
      headers: rateLimitHeaders,
      body: JSON.stringify({
        success: false,
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(((resetTime || Date.now()) - Date.now()) / 1000)
      })
    };
  }

  try {
    // Parse request body
    let requestBody: any;
    try {
      const bodyText = await request.text();
      requestBody = JSON.parse(bodyText);
    } catch (parseError) {
      logger.log({
        level: 'warn',
        message: 'Failed to parse request body',
        properties: {
          error: parseError instanceof Error ? parseError.message : 'Unknown parse error',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      });
      
      const duration = Date.now() - startTime;
      logger.logApiRequest('/api/submitPlan', request.method, 400, duration);
      
      return {
        status: 400,
        headers: securityHeaders,
        body: JSON.stringify({
          success: false,
          error: 'Invalid JSON',
          message: 'Request body must be valid JSON'
        })
      };
    }

    // Add request metadata
    requestBody.userAgent = request.headers.get('user-agent');
    requestBody.ipAddress = clientIP;

    // Validate and sanitize input
    const validation = validatePlanSubmission(requestBody);
    
    if (!validation.isValid) {
      logger.log({
        level: 'warn',
        message: 'Plan submission validation failed',
        properties: {
          validationErrors: JSON.stringify(validation.errors),
          userAgent: request.headers.get('user-agent') || 'unknown',
          ipAddress: requestBody.ipAddress || 'unknown'
        }
      });
      
      const duration = Date.now() - startTime;
      logger.logApiRequest('/api/submitPlan', request.method, 400, duration);
      
      return {
        status: 400,
        headers: securityHeaders,
        body: JSON.stringify({
          success: false,
          error: 'Validation failed',
          message: 'Please check your input data',
          details: validation.errors
        })
      };
    }

    const planSubmission = validation.sanitized as PlanSubmission;
    const submissionId = generateSubmissionId();
    
    // Log the successful submission with structured logging
    logger.logPlanSubmission(submissionId, {
      name: planSubmission.name,
      date: planSubmission.date,
      activitiesCount: planSubmission.activities.length,
      hasCustomActivity: !!planSubmission.customActivity,
      userAgent: planSubmission.userAgent,
      ipAddress: planSubmission.ipAddress
    });

    // Send email notification
    let emailSent = false;
    const emailStartTime = Date.now();
    
    try {
      const emailService = new EmailService();
      const toAddress = process.env.EMAIL_TO_ADDRESS || 'unknown';
      
      logger.logEmailEvent('attempt', {
        recipientEmail: toAddress,
        planSubmissionId: submissionId
      });
      
      emailSent = await emailService.sendPlanNotification(planSubmission, context);
      const emailDuration = Date.now() - emailStartTime;
      
      if (emailSent) {
        logger.logEmailEvent('success', {
          recipientEmail: toAddress,
          planSubmissionId: submissionId,
          duration: emailDuration
        });
      } else {
        logger.logEmailEvent('failure', {
          recipientEmail: toAddress,
          planSubmissionId: submissionId,
          errorMessage: 'Email service returned false',
          duration: emailDuration
        });
      }
    } catch (emailError) {
      const emailDuration = Date.now() - emailStartTime;
      const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown email error';
      
      logger.logEmailEvent('failure', {
        recipientEmail: process.env.EMAIL_TO_ADDRESS || 'unknown',
        planSubmissionId: submissionId,
        errorMessage,
        duration: emailDuration
      });
      
      // Don't fail the entire request if email fails
    }
    
    const duration = Date.now() - startTime;
    logger.logApiRequest('/api/submitPlan', request.method, 200, duration);
    
    // Flush telemetry data
    await logger.flush();
    
    // Add rate limit headers to successful response
    const successHeaders = {
      ...securityHeaders,
      'X-RateLimit-Limit': '10',
      'X-RateLimit-Remaining': (ipRateLimit.remaining || 0).toString(),
      'X-RateLimit-Reset': Math.ceil((ipRateLimit.resetTime || Date.now()) / 1000).toString()
    };
    
    return {
      status: 200,
      headers: successHeaders,
      body: JSON.stringify({
        success: true,
        message: 'Plan submission received successfully',
        submissionId: submissionId,
        submittedAt: planSubmission.submittedAt,
        emailSent: emailSent
      })
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.log({
      level: 'error',
      message: 'Unexpected error processing plan submission',
      properties: {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    });
    
    logger.logApiRequest('/api/submitPlan', request.method, 500, duration);
    await logger.flush();
    
    return {
      status: 500,
      headers: securityHeaders,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'An unexpected error occurred while processing your request'
      })
    };
  }
}

function generateSubmissionId(): string {
  return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

app.http('submitPlan', {
  methods: ['GET', 'POST', 'OPTIONS'],
  authLevel: 'anonymous',
  handler: submitPlan
});