import { HttpRequest, InvocationContext } from '@azure/functions';
import { healthCheck } from '../healthCheck';
import { globalRateLimiter } from '../../utils/rateLimiter';

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = {
    ...originalEnv,
    APPLICATIONINSIGHTS_CONNECTION_STRING: 'InstrumentationKey=test-key;IngestionEndpoint=https://test.applicationinsights.azure.com/',
    COMMUNICATION_SERVICES_CONNECTION_STRING: 'endpoint=https://test.communication.azure.com/;accesskey=test-key',
    EMAIL_FROM_ADDRESS: 'test@example.com',
    EMAIL_TO_ADDRESS: 'notifications@example.com'
  };
});

afterEach(() => {
  process.env = originalEnv;
});

afterAll(() => {
  // Clean up rate limiter to prevent Jest warning
  globalRateLimiter.destroy();
});

describe('healthCheck', () => {
  const mockContext = {
    log: jest.fn(),
    invocationId: 'test-invocation-id',
    functionName: 'healthCheck',
    extraInputs: new Map(),
    extraOutputs: new Map()
  } as unknown as InvocationContext;

  const mockRequest = {
    method: 'GET',
    url: 'https://test.azurewebsites.net/api/health',
    headers: new Map(),
    query: new Map(),
    params: {},
    user: null
  } as unknown as HttpRequest;

  it('should return healthy status when all services are configured', async () => {
    const response = await healthCheck(mockRequest, mockContext);

    expect(response.status).toBe(200);
    expect(response.headers).toEqual({
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    });

    const body = JSON.parse(response.body as string);
    expect(body.status).toBe('healthy');
    expect(body.checks.applicationInsights.status).toBe('healthy');
    expect(body.checks.communicationServices.status).toBe('healthy');
    expect(body.checks.runtime.status).toBe('healthy');
  });

  it('should return unhealthy status when Communication Services is not configured', async () => {
    delete process.env.COMMUNICATION_SERVICES_CONNECTION_STRING;

    const response = await healthCheck(mockRequest, mockContext);

    expect(response.status).toBe(503);
    const body = JSON.parse(response.body as string);
    expect(body.status).toBe('unhealthy');
    expect(body.checks.communicationServices.status).toBe('unhealthy');
  });

  it('should return warning for Application Insights when not configured', async () => {
    delete process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

    const response = await healthCheck(mockRequest, mockContext);

    const body = JSON.parse(response.body as string);
    expect(body.checks.applicationInsights.status).toBe('warning');
  });

  it('should return runtime check failure when Node.js version is too old', async () => {
    // Mock Node.js version to be old
    const originalVersion = process.version;
    Object.defineProperty(process, 'version', {
      value: 'v16.0.0',
      writable: true
    });

    const response = await healthCheck(mockRequest, mockContext);

    const body = JSON.parse(response.body as string);
    expect(body.checks.runtime.status).toBe('warning');
    expect(body.checks.runtime.message).toContain('Node.js version v16.0.0 is below recommended version 18');

    // Restore original version
    Object.defineProperty(process, 'version', {
      value: originalVersion,
      writable: true
    });
  });
});