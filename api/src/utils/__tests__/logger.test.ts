import { Logger } from '../logger';
import { InvocationContext } from '@azure/functions';

// Mock Application Insights
jest.mock('applicationinsights', () => ({
  setup: jest.fn().mockReturnThis(),
  setAutoDependencyCorrelation: jest.fn().mockReturnThis(),
  setAutoCollectRequests: jest.fn().mockReturnThis(),
  setAutoCollectPerformance: jest.fn().mockReturnThis(),
  setAutoCollectExceptions: jest.fn().mockReturnThis(),
  setAutoCollectDependencies: jest.fn().mockReturnThis(),
  setAutoCollectConsole: jest.fn().mockReturnThis(),
  setUseDiskRetryCaching: jest.fn().mockReturnThis(),
  setSendLiveMetrics: jest.fn().mockReturnThis(),
  start: jest.fn(),
  defaultClient: {
    trackTrace: jest.fn(),
    trackException: jest.fn(),
    trackEvent: jest.fn(),
    trackDependency: jest.fn(),
    trackMetric: jest.fn(),
    flush: jest.fn((options) => options?.callback && options.callback())
  },
  Contracts: {
    SeverityLevel: {
      Information: 1,
      Warning: 2,
      Error: 3,
      Verbose: 0
    }
  }
}));

describe('Logger', () => {
  let mockContext: InvocationContext;
  let logger: Logger;

  beforeEach(() => {
    mockContext = {
      log: jest.fn(),
      invocationId: 'test-invocation-id',
      functionName: 'testFunction',
      extraInputs: new Map(),
      extraOutputs: new Map()
    } as unknown as InvocationContext;

    logger = new Logger(mockContext);
    jest.clearAllMocks();
  });

  describe('log', () => {
    it('should log info messages to context and Application Insights', () => {
      const appInsights = require('applicationinsights');
      
      logger.log({
        level: 'info',
        message: 'Test info message',
        properties: { key: 'value' },
        metrics: { count: 1 }
      });

      expect(mockContext.log).toHaveBeenCalledWith('[INFO] Test info message', { key: 'value' });
      expect(appInsights.defaultClient.trackTrace).toHaveBeenCalledWith({
        message: 'Test info message',
        severity: 1,
        properties: { key: 'value' }
      });
      expect(appInsights.defaultClient.trackMetric).toHaveBeenCalledWith({
        name: 'count',
        value: 1
      });
    });

    it('should log error messages to context and Application Insights', () => {
      const appInsights = require('applicationinsights');
      
      logger.log({
        level: 'error',
        message: 'Test error message',
        properties: { error: 'Something went wrong' }
      });

      expect(mockContext.log).toHaveBeenCalledWith('[ERROR] Test error message', { error: 'Something went wrong' });
      expect(appInsights.defaultClient.trackException).toHaveBeenCalledWith({
        exception: expect.any(Error),
        properties: { error: 'Something went wrong' },
        measurements: undefined
      });
    });
  });

  describe('logEmailEvent', () => {
    it('should log email success events', () => {
      const appInsights = require('applicationinsights');
      
      logger.logEmailEvent('success', {
        recipientEmail: 'test@example.com',
        planSubmissionId: 'sub_123',
        duration: 1500
      });

      expect(mockContext.log).toHaveBeenCalledWith(
        '[INFO] Email notification success',
        expect.objectContaining({
          event: 'email_success',
          recipientEmail: 'test@example.com',
          planSubmissionId: 'sub_123'
        })
      );

      expect(appInsights.defaultClient.trackEvent).toHaveBeenCalledWith({
        name: 'EmailNotificationSuccess',
        properties: expect.objectContaining({
          event: 'email_success',
          recipientEmail: 'test@example.com'
        }),
        measurements: {
          emailDeliveryDuration: 1500
        }
      });
    });

    it('should log email failure events', () => {
      logger.logEmailEvent('failure', {
        recipientEmail: 'test@example.com',
        planSubmissionId: 'sub_123',
        errorMessage: 'SMTP error',
        duration: 500
      });

      expect(mockContext.log).toHaveBeenCalledWith(
        '[ERROR] Email notification failure',
        expect.objectContaining({
          event: 'email_failure',
          errorMessage: 'SMTP error'
        })
      );
    });
  });

  describe('logPlanSubmission', () => {
    it('should log plan submission events with metrics', () => {
      const appInsights = require('applicationinsights');
      
      logger.logPlanSubmission('sub_123', {
        name: 'John Doe',
        date: '2024-02-14',
        activitiesCount: 3,
        hasCustomActivity: true,
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.1'
      });

      expect(mockContext.log).toHaveBeenCalledWith(
        '[INFO] Plan submission received',
        expect.objectContaining({
          submissionId: 'sub_123',
          planDate: '2024-02-14',
          activitiesCount: '3',
          hasCustomActivity: 'true'
        })
      );

      expect(appInsights.defaultClient.trackEvent).toHaveBeenCalledWith({
        name: 'PlanSubmission',
        properties: expect.objectContaining({
          submissionId: 'sub_123'
        }),
        measurements: {
          activitiesCount: 3
        }
      });
    });
  });

  describe('logApiRequest', () => {
    it('should log successful API requests', () => {
      logger.logApiRequest('/api/test', 'POST', 200, 150);

      expect(mockContext.log).toHaveBeenCalledWith(
        '[INFO] API request completed',
        expect.objectContaining({
          endpoint: '/api/test',
          method: 'POST',
          statusCode: '200'
        })
      );
    });

    it('should log failed API requests as warnings', () => {
      logger.logApiRequest('/api/test', 'POST', 400, 50);

      expect(mockContext.log).toHaveBeenCalledWith(
        '[WARN] API request completed',
        expect.objectContaining({
          statusCode: '400'
        })
      );
    });
  });

  describe('flush', () => {
    it('should flush telemetry data', async () => {
      const appInsights = require('applicationinsights');
      
      await logger.flush();

      expect(appInsights.defaultClient.flush).toHaveBeenCalledWith({
        callback: expect.any(Function)
      });
    });
  });
});