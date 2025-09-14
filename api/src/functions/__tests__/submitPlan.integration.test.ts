import { submitPlan } from '../submitPlan';
import { HttpRequest, InvocationContext } from '@azure/functions';
import { submitPlanRateLimiter, globalRateLimiter } from '../../utils/rateLimiter';

// Mock the EmailService
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

describe('submitPlan Integration Tests', () => {
  let mockContext: InvocationContext;

  beforeEach(() => {
    mockContext = {
      log: jest.fn(),
      invocationId: 'test-id',
      functionName: 'submitPlan',
      extraInputs: new Map(),
      extraOutputs: new Map()
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    // Clean up rate limiters to prevent Jest warning
    submitPlanRateLimiter.destroy();
    globalRateLimiter.destroy();
  });

  test('should process valid plan submission and send email', async () => {
    const validPlanData = {
      name: 'John Doe',
      date: '2025-02-14',
      time: '19:00',
      activities: ['Dinner at restaurant', 'Movie theater'],
      customActivity: 'Walk in the park'
    };

    const mockRequest = {
      method: 'POST',
      text: jest.fn().mockResolvedValue(JSON.stringify(validPlanData)),
      headers: new Map([
        ['content-type', 'application/json'],
        ['user-agent', 'Mozilla/5.0'],
        ['x-forwarded-for', '192.168.1.1']
      ])
    } as any as HttpRequest;

    const response = await submitPlan(mockRequest, mockContext);

    expect(response.status).toBe(200);
    
    const responseBody = JSON.parse(response.body as string);
    expect(responseBody.success).toBe(true);
    expect(responseBody.message).toBe('Plan submission received successfully');
    expect(responseBody.emailSent).toBe(true);
    expect(responseBody.submissionId).toMatch(/^sub_\d+_[a-z0-9]+$/);
    expect(responseBody.submittedAt).toBeDefined();
  });

  test('should handle email service failure gracefully', async () => {
    // Mock email service to fail
    const { EmailService } = require('../../services/emailService');
    EmailService.mockImplementation(() => ({
      sendPlanNotification: jest.fn().mockResolvedValue(false)
    }));

    const validPlanData = {
      name: 'John Doe',
      date: '2025-02-14',
      time: '19:00',
      activities: ['Dinner at restaurant', 'Movie theater']
    };

    const mockRequest = {
      method: 'POST',
      text: jest.fn().mockResolvedValue(JSON.stringify(validPlanData)),
      headers: new Map([
        ['content-type', 'application/json'],
        ['user-agent', 'Mozilla/5.0'],
        ['x-forwarded-for', '192.168.1.2']
      ])
    } as any as HttpRequest;

    const response = await submitPlan(mockRequest, mockContext);

    expect(response.status).toBe(200);
    
    const responseBody = JSON.parse(response.body as string);
    expect(responseBody.success).toBe(true);
    expect(responseBody.emailSent).toBe(false);
    
    // Should still return success even if email fails
    expect(mockContext.log).toHaveBeenCalledWith(
      '[ERROR] Email notification failure',
      expect.objectContaining({
        event: 'email_failure',
        errorMessage: 'Email service returned false'
      })
    );
  });

  test('should handle email service initialization error gracefully', async () => {
    // Mock email service constructor to throw
    const { EmailService } = require('../../services/emailService');
    EmailService.mockImplementation(() => {
      throw new Error('Connection string not found');
    });

    const validPlanData = {
      name: 'John Doe',
      date: '2025-02-14',
      time: '19:00',
      activities: ['Dinner at restaurant', 'Movie theater']
    };

    const mockRequest = {
      method: 'POST',
      text: jest.fn().mockResolvedValue(JSON.stringify(validPlanData)),
      headers: new Map([
        ['content-type', 'application/json'],
        ['user-agent', 'Mozilla/5.0'],
        ['x-forwarded-for', '192.168.1.3']
      ])
    } as any as HttpRequest;

    const response = await submitPlan(mockRequest, mockContext);

    expect(response.status).toBe(200);
    
    const responseBody = JSON.parse(response.body as string);
    expect(responseBody.success).toBe(true);
    expect(responseBody.emailSent).toBe(false);
    
    // Should log the error but not fail the request
    expect(mockContext.log).toHaveBeenCalledWith(
      '[ERROR] Email notification failure',
      expect.objectContaining({
        event: 'email_failure',
        errorMessage: 'Connection string not found'
      })
    );
  });

  test('should handle rate limiting correctly', async () => {
    const validPlanData = {
      name: 'Rate Limit Test',
      date: '2025-02-14',
      time: '19:00',
      activities: ['Dinner at restaurant']
    };

    // Create multiple requests to trigger rate limiting
    const requests = Array.from({ length: 12 }, () => ({
      method: 'POST',
      text: jest.fn().mockResolvedValue(JSON.stringify(validPlanData)),
      headers: new Map([
        ['content-type', 'application/json'],
        ['user-agent', 'Mozilla/5.0'],
        ['x-forwarded-for', '192.168.1.100']
      ])
    } as any as HttpRequest));

    // Send multiple requests rapidly to trigger rate limiting
    const responses = await Promise.all(
      requests.map(request => submitPlan(request, mockContext))
    );

    // At least one should be rate limited (429)
    const rateLimitedResponses = responses.filter(r => r.status === 429);
    expect(rateLimitedResponses.length).toBeGreaterThan(0);
    
    if (rateLimitedResponses.length > 0) {
      const responseBody = JSON.parse(rateLimitedResponses[0].body as string);
      expect(responseBody.success).toBe(false);
      expect(responseBody.message).toContain('Too many requests');
    }
  });

  test('should validate input data thoroughly', async () => {
    const invalidPlanData = {
      name: '', // Empty name
      date: 'invalid-date',
      time: '25:00', // Invalid time
      activities: [], // Empty activities
      customActivity: 'x'.repeat(1001) // Too long custom activity
    };

    const mockRequest = {
      method: 'POST',
      text: jest.fn().mockResolvedValue(JSON.stringify(invalidPlanData)),
      headers: new Map([
        ['content-type', 'application/json'],
        ['user-agent', 'Mozilla/5.0'],
        ['x-forwarded-for', '192.168.1.4']
      ])
    } as any as HttpRequest;

    const response = await submitPlan(mockRequest, mockContext);

    expect(response.status).toBe(400);
    
    const responseBody = JSON.parse(response.body as string);
    expect(responseBody.success).toBe(false);
    expect(responseBody.message).toContain('check your input');
    expect(responseBody.details).toBeDefined();
    expect(Array.isArray(responseBody.details)).toBe(true);
  });

  test('should handle malformed JSON gracefully', async () => {
    const mockRequest = {
      method: 'POST',
      text: jest.fn().mockResolvedValue('{ invalid json }'),
      headers: new Map([
        ['content-type', 'application/json'],
        ['user-agent', 'Mozilla/5.0'],
        ['x-forwarded-for', '192.168.1.5']
      ])
    } as any as HttpRequest;

    const response = await submitPlan(mockRequest, mockContext);

    expect(response.status).toBe(400);
    
    const responseBody = JSON.parse(response.body as string);
    expect(responseBody.success).toBe(false);
    expect(responseBody.message).toContain('valid JSON');
  });

  test('should handle unsupported HTTP methods', async () => {
    const mockRequest = {
      method: 'GET',
      text: jest.fn(),
      headers: new Map()
    } as any as HttpRequest;

    const response = await submitPlan(mockRequest, mockContext);

    expect(response.status).toBe(405);
    
    const responseBody = JSON.parse(response.body as string);
    expect(responseBody.success).toBe(false);
    expect(responseBody.message).toContain('POST requests are supported');
  });
});