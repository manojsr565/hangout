import { submitPlan } from '../submitPlan';
import { healthCheck } from '../healthCheck';
import { HttpRequest, InvocationContext } from '@azure/functions';
import { submitPlanRateLimiter, globalRateLimiter } from '../../utils/rateLimiter';

// Mock the EmailService for E2E tests
jest.mock('../../services/emailService', () => ({
  EmailService: jest.fn().mockImplementation(() => ({
    sendPlanNotification: jest.fn().mockResolvedValue(true)
  }))
}));

// Mock Application Insights
jest.mock('applicationinsights', () => ({
  setup: jest.fn().mockReturnThis(),
  start: jest.fn(),
  defaultClient: {
    trackEvent: jest.fn(),
    trackException: jest.fn(),
    trackRequest: jest.fn(),
    trackTrace: jest.fn(),
    trackMetric: jest.fn(),
    trackDependency: jest.fn(),
    flush: jest.fn((options) => {
      if (options && options.callback) {
        setTimeout(options.callback, 0);
      }
    })
  },
  Contracts: {
    SeverityLevel: {
      Verbose: 0,
      Information: 1,
      Warning: 2,
      Error: 3,
      Critical: 4
    }
  }
}));

describe('End-to-End Integration Tests', () => {
  let mockContext: InvocationContext;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Store original environment
    originalEnv = process.env;
    
    // Set up test environment variables
    process.env = {
      ...originalEnv,
      COMMUNICATION_SERVICES_CONNECTION_STRING: 'endpoint=https://test.communication.azure.com/;accesskey=test-key',
      EMAIL_FROM_ADDRESS: 'test@example.com',
      EMAIL_TO_ADDRESS: 'notifications@example.com',
      APPLICATIONINSIGHTS_CONNECTION_STRING: 'InstrumentationKey=test-key;IngestionEndpoint=https://test.applicationinsights.azure.com/'
    };

    mockContext = {
      log: jest.fn(),
      invocationId: 'e2e-test-id',
      functionName: 'e2e-test',
      extraInputs: new Map(),
      extraOutputs: new Map()
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Restore original environment
    process.env = originalEnv;
  });

  afterAll(() => {
    // Clean up rate limiters to prevent Jest warning
    submitPlanRateLimiter.destroy();
    globalRateLimiter.destroy();
  });

  describe('Complete User Journey', () => {
    test('should handle complete plan submission flow from React app', async () => {
      // Simulate the exact payload that would come from the React app
      const reactAppPayload = {
        name: 'Sarah Johnson',
        date: '2025-03-15T00:00:00.000Z', // ISO string from React Date object
        time: '18:30',
        activities: [
          'Dinner at restaurant',
          'Movie theater',
          'Walk in the park'
        ],
        customActivity: 'Visit the local art gallery',
        submittedAt: '2025-02-13T14:30:00.000Z'
      };

      const mockRequest = {
        method: 'POST',
        text: jest.fn().mockResolvedValue(JSON.stringify(reactAppPayload)),
        headers: new Map([
          ['content-type', 'application/json'],
          ['user-agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'],
          ['x-forwarded-for', '203.0.113.1'],
          ['origin', 'https://swa-dating-planner.azurestaticapps.net'],
          ['referer', 'https://swa-dating-planner.azurestaticapps.net/']
        ])
      } as any as HttpRequest;

      const response = await submitPlan(mockRequest, mockContext);

      // Verify successful response
      expect(response.status).toBe(200);
      
      const responseBody = JSON.parse(response.body as string);
      expect(responseBody).toMatchObject({
        success: true,
        message: 'Plan submission received successfully',
        emailSent: true,
        submissionId: expect.stringMatching(/^sub_\d+_[a-z0-9]+$/),
        submittedAt: expect.any(String)
      });

      // Verify logging occurred
      expect(mockContext.log).toHaveBeenCalledWith(
        '[INFO] Plan submission received',
        expect.objectContaining({
          submissionId: expect.any(String),
          planDate: '2025-03-15T00:00:00.000Z',
          activitiesCount: '3',
          hasCustomActivity: 'true',
          userAgent: expect.stringContaining('iPhone'),
          ipAddress: '203.0.113.1',
          timestamp: expect.any(String)
        })
      );

      expect(mockContext.log).toHaveBeenCalledWith(
        '[INFO] Email notification success',
        expect.objectContaining({
          event: 'email_success',
          planSubmissionId: expect.any(String),
          recipientEmail: 'notifications@example.com',
          timestamp: expect.any(String)
        })
      );
    });

    test('should handle mobile user submission with minimal data', async () => {
      // Test with minimal required data (no custom activity)
      const minimalPayload = {
        name: 'Alex',
        date: '2025-02-20T00:00:00.000Z',
        time: '20:00',
        activities: ['Dinner at restaurant'],
        submittedAt: '2025-02-13T15:00:00.000Z'
      };

      const mockRequest = {
        method: 'POST',
        text: jest.fn().mockResolvedValue(JSON.stringify(minimalPayload)),
        headers: new Map([
          ['content-type', 'application/json'],
          ['user-agent', 'Mozilla/5.0 (Android 13; Mobile; rv:109.0) Gecko/111.0 Firefox/111.0'],
          ['x-forwarded-for', '198.51.100.1']
        ])
      } as any as HttpRequest;

      const response = await submitPlan(mockRequest, mockContext);

      expect(response.status).toBe(200);
      
      const responseBody = JSON.parse(response.body as string);
      expect(responseBody.success).toBe(true);
      expect(responseBody.emailSent).toBe(true);
      expect(responseBody.submissionId).toBeDefined();
    });

    test('should handle network retry scenario gracefully', async () => {
      // Simulate email service temporary failure then success
      const { EmailService } = require('../../services/emailService');
      let callCount = 0;
      EmailService.mockImplementation(() => ({
        sendPlanNotification: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve(false); // First call fails
          }
          return Promise.resolve(true); // Subsequent calls succeed
        })
      }));

      const payload = {
        name: 'Retry Test User',
        date: '2025-02-25T00:00:00.000Z',
        time: '19:00',
        activities: ['Dinner at restaurant'],
        submittedAt: '2025-02-13T16:00:00.000Z'
      };

      const mockRequest = {
        method: 'POST',
        text: jest.fn().mockResolvedValue(JSON.stringify(payload)),
        headers: new Map([
          ['content-type', 'application/json'],
          ['user-agent', 'Mozilla/5.0'],
          ['x-forwarded-for', '192.0.2.1']
        ])
      } as any as HttpRequest;

      const response = await submitPlan(mockRequest, mockContext);

      // Should still return success even if email fails
      expect(response.status).toBe(200);
      
      const responseBody = JSON.parse(response.body as string);
      expect(responseBody.success).toBe(true);
      expect(responseBody.emailSent).toBe(false); // Email failed on first attempt
    });
  });

  describe('Health Check Integration', () => {
    test('should verify health check endpoint works correctly', async () => {
      const mockRequest = {
        method: 'GET',
        headers: new Map()
      } as any as HttpRequest;

      const response = await healthCheck(mockRequest, mockContext);

      expect(response.status).toBe(200);
      
      const responseBody = JSON.parse(response.body as string);
      expect(responseBody).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        version: expect.any(String),
        environment: expect.any(String),
        checks: expect.objectContaining({
          applicationInsights: expect.objectContaining({ status: expect.any(String) }),
          communicationServices: expect.objectContaining({ status: expect.any(String) }),
          runtime: expect.objectContaining({ status: expect.any(String) })
        })
      });
    });
  });

  describe('Cross-Origin Resource Sharing (CORS)', () => {
    test('should handle CORS preflight requests correctly', async () => {
      const corsRequest = {
        method: 'OPTIONS',
        headers: new Map([
          ['origin', 'https://swa-dating-planner.azurestaticapps.net'],
          ['access-control-request-method', 'POST'],
          ['access-control-request-headers', 'content-type']
        ])
      } as any as HttpRequest;

      const response = await submitPlan(corsRequest, mockContext);

      // Should handle OPTIONS request appropriately
      expect(response.status).toBe(200);
      expect(response.headers).toBeDefined();
    });

    test('should include proper CORS headers in responses', async () => {
      const payload = {
        name: 'CORS Test',
        date: '2025-02-28T00:00:00.000Z',
        time: '18:00',
        activities: ['Dinner at restaurant'],
        submittedAt: '2025-02-13T17:00:00.000Z'
      };

      const mockRequest = {
        method: 'POST',
        text: jest.fn().mockResolvedValue(JSON.stringify(payload)),
        headers: new Map([
          ['content-type', 'application/json'],
          ['origin', 'https://swa-dating-planner.azurestaticapps.net']
        ])
      } as any as HttpRequest;

      const response = await submitPlan(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.headers).toBeDefined();
      
      // Verify CORS headers are present
      const headers = response.headers as Record<string, string>;
      expect(headers['Access-Control-Allow-Origin']).toBeDefined();
      expect(headers['Access-Control-Allow-Methods']).toBeDefined();
      expect(headers['Access-Control-Allow-Headers']).toBeDefined();
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle multiple concurrent submissions', async () => {
      const submissions = Array.from({ length: 5 }, (_, i) => ({
        name: `User ${i + 1}`,
        date: '2025-03-01T00:00:00.000Z',
        time: '19:00',
        activities: ['Dinner at restaurant'],
        submittedAt: new Date().toISOString()
      }));

      const requests = submissions.map((payload, i) => {
        const mockRequest = {
          method: 'POST',
          text: jest.fn().mockResolvedValue(JSON.stringify(payload)),
          headers: new Map([
            ['content-type', 'application/json'],
            ['x-forwarded-for', `192.168.1.${i + 10}`]
          ])
        } as any as HttpRequest;

        return submitPlan(mockRequest, mockContext);
      });

      const responses = await Promise.all(requests);

      // All requests should succeed
      responses.forEach((response, i) => {
        expect(response.status).toBe(200);
        const body = JSON.parse(response.body as string);
        expect(body.success).toBe(true);
        expect(body.submissionId).toBeDefined();
      });
    });

    test('should handle large payload within limits', async () => {
      const largePayload = {
        name: 'Large Payload Test User',
        date: '2025-03-05T00:00:00.000Z',
        time: '20:00',
        activities: Array.from({ length: 10 }, (_, i) => `Activity ${i + 1}: Description here`),
        customActivity: 'Custom activity with detailed description here',
        submittedAt: new Date().toISOString()
      };

      const mockRequest = {
        method: 'POST',
        text: jest.fn().mockResolvedValue(JSON.stringify(largePayload)),
        headers: new Map([
          ['content-type', 'application/json'],
          ['x-forwarded-for', '192.168.1.200']
        ])
      } as any as HttpRequest;

      const response = await submitPlan(mockRequest, mockContext);

      expect(response.status).toBe(200);
      
      const responseBody = JSON.parse(response.body as string);
      expect(responseBody.success).toBe(true);
      expect(responseBody.emailSent).toBe(true);
    });
  });
});