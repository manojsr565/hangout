import * as appInsights from 'applicationinsights';
import { InvocationContext } from '@azure/functions';

// Initialize Application Insights if connection string is available
const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
if (connectionString) {
  appInsights.setup(connectionString)
    .setAutoDependencyCorrelation(true)
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true, true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectConsole(true)
    .setUseDiskRetryCaching(true)
    .setSendLiveMetrics(false)
    .start();
}

export interface LogContext {
  operationId?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
}

export interface StructuredLogData {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  properties?: Record<string, any>;
  metrics?: Record<string, number>;
  context?: LogContext;
}

export class Logger {
  private context: InvocationContext;
  private client?: appInsights.TelemetryClient;

  constructor(context: InvocationContext) {
    this.context = context;
    this.client = appInsights.defaultClient;
  }

  /**
   * Log structured data to both Azure Functions logging and Application Insights
   */
  log(data: StructuredLogData): void {
    const logMessage = `[${data.level.toUpperCase()}] ${data.message}`;
    
    // Log to Azure Functions context (appears in Function App logs)
    this.context.log(logMessage, data.properties || {});

    // Log to Application Insights if available
    if (this.client) {
      switch (data.level) {
        case 'error':
          this.client.trackException({
            exception: new Error(data.message),
            properties: data.properties,
            measurements: data.metrics
          });
          break;
        case 'warn':
          this.client.trackTrace({
            message: data.message,
            severity: appInsights.Contracts.SeverityLevel.Warning,
            properties: data.properties
          });
          if (data.metrics) {
            Object.entries(data.metrics).forEach(([key, value]) => {
              this.client?.trackMetric({ name: key, value });
            });
          }
          break;
        case 'info':
          this.client.trackTrace({
            message: data.message,
            severity: appInsights.Contracts.SeverityLevel.Information,
            properties: data.properties
          });
          if (data.metrics) {
            Object.entries(data.metrics).forEach(([key, value]) => {
              this.client?.trackMetric({ name: key, value });
            });
          }
          break;
        case 'debug':
          this.client.trackTrace({
            message: data.message,
            severity: appInsights.Contracts.SeverityLevel.Verbose,
            properties: data.properties
          });
          if (data.metrics) {
            Object.entries(data.metrics).forEach(([key, value]) => {
              this.client?.trackMetric({ name: key, value });
            });
          }
          break;
      }
    }
  }

  /**
   * Log email notification events with structured data
   */
  logEmailEvent(event: 'attempt' | 'success' | 'failure', details: {
    recipientEmail: string;
    planSubmissionId?: string;
    errorMessage?: string;
    duration?: number;
  }): void {
    const properties: Record<string, string> = {
      event: `email_${event}`,
      recipientEmail: details.recipientEmail,
      planSubmissionId: details.planSubmissionId || 'unknown',
      timestamp: new Date().toISOString()
    };

    if (details.errorMessage) {
      properties.errorMessage = details.errorMessage;
    }

    const metrics: Record<string, number> = {};
    if (details.duration !== undefined) {
      metrics.emailDeliveryDuration = details.duration;
    }

    this.log({
      level: event === 'failure' ? 'error' : 'info',
      message: `Email notification ${event}`,
      properties,
      metrics: Object.keys(metrics).length > 0 ? metrics : undefined
    });

    // Track custom event for email notifications
    if (this.client) {
      this.client.trackEvent({
        name: `EmailNotification${event.charAt(0).toUpperCase() + event.slice(1)}`,
        properties,
        measurements: metrics
      });
    }
  }

  /**
   * Log plan submission events
   */
  logPlanSubmission(submissionId: string, details: {
    name: string;
    date: string;
    activitiesCount: number;
    hasCustomActivity: boolean;
    userAgent?: string;
    ipAddress?: string;
  }): void {
    const properties = {
      submissionId,
      planDate: details.date,
      activitiesCount: details.activitiesCount.toString(),
      hasCustomActivity: details.hasCustomActivity.toString(),
      userAgent: details.userAgent || 'unknown',
      ipAddress: details.ipAddress || 'unknown',
      timestamp: new Date().toISOString()
    };

    this.log({
      level: 'info',
      message: 'Plan submission received',
      properties,
      metrics: {
        activitiesCount: details.activitiesCount
      }
    });

    // Track custom event for plan submissions
    if (this.client) {
      this.client.trackEvent({
        name: 'PlanSubmission',
        properties,
        measurements: {
          activitiesCount: details.activitiesCount
        }
      });
    }
  }

  /**
   * Log API request metrics
   */
  logApiRequest(endpoint: string, method: string, statusCode: number, duration: number): void {
    const properties = {
      endpoint,
      method,
      statusCode: statusCode.toString(),
      timestamp: new Date().toISOString()
    };

    this.log({
      level: statusCode >= 400 ? 'warn' : 'info',
      message: `API request completed`,
      properties,
      metrics: {
        requestDuration: duration,
        statusCode
      }
    });

    // Track dependency for API requests
    if (this.client) {
      this.client.trackDependency({
        name: `${method} ${endpoint}`,
        data: endpoint,
        duration,
        success: statusCode < 400,
        resultCode: statusCode.toString(),
        dependencyTypeName: 'HTTP'
      });
    }
  }

  /**
   * Flush any pending telemetry data
   */
  flush(): Promise<void> {
    return new Promise((resolve) => {
      if (this.client) {
        this.client.flush({
          callback: () => resolve()
        });
      } else {
        resolve();
      }
    });
  }
}