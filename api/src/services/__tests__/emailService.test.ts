import { EmailService } from '../emailService';
import { PlanSubmission } from '../../types';
import { InvocationContext } from '@azure/functions';

// Mock the Azure Communication Services
jest.mock('@azure/communication-email', () => ({
  EmailClient: jest.fn().mockImplementation(() => ({
    beginSend: jest.fn().mockResolvedValue({
      pollUntilDone: jest.fn().mockResolvedValue({
        status: 'Succeeded',
        id: 'test-message-id'
      })
    })
  }))
}));

describe('EmailService', () => {
  let emailService: EmailService;
  let mockContext: InvocationContext;

  beforeEach(() => {
    // Set up environment variables
    process.env.COMMUNICATION_SERVICES_CONNECTION_STRING = 'test-connection-string';
    process.env.EMAIL_FROM_ADDRESS = 'test@example.com';
    process.env.EMAIL_TO_ADDRESS = 'notifications@example.com';

    // Create mock context
    mockContext = {
      log: jest.fn(),
      invocationId: 'test-id',
      functionName: 'test-function',
      extraInputs: new Map(),
      extraOutputs: new Map()
    } as any;

    emailService = new EmailService();
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.COMMUNICATION_SERVICES_CONNECTION_STRING;
    delete process.env.EMAIL_FROM_ADDRESS;
    delete process.env.EMAIL_TO_ADDRESS;
  });

  test('should send email notification successfully', async () => {
    const planSubmission: PlanSubmission = {
      name: 'John Doe',
      date: '2024-02-14',
      time: '7:00 PM',
      activities: ['Dinner', 'Movie'],
      customActivity: 'Walk in the park',
      submittedAt: '2024-02-10T10:00:00Z',
      userAgent: 'Mozilla/5.0',
      ipAddress: '192.168.1.1'
    };

    const result = await emailService.sendPlanNotification(planSubmission, mockContext);

    expect(result).toBe(true);
    expect(mockContext.log).toHaveBeenCalledWith(
      expect.stringContaining('Attempting to send email notification')
    );
    expect(mockContext.log).toHaveBeenCalledWith(
      'Email notification sent successfully',
      expect.objectContaining({
        messageId: 'test-message-id',
        planName: 'John Doe',
        planDate: '2024-02-14'
      })
    );
  });

  test('should handle missing connection string', () => {
    delete process.env.COMMUNICATION_SERVICES_CONNECTION_STRING;

    expect(() => new EmailService()).toThrow(
      'COMMUNICATION_SERVICES_CONNECTION_STRING environment variable is required'
    );
  });

  test('should escape HTML in email content', async () => {
    const planSubmission: PlanSubmission = {
      name: '<script>alert("xss")</script>',
      date: '2024-02-14',
      time: '7:00 PM',
      activities: ['<b>Dinner</b>', 'Movie & Popcorn'],
      customActivity: 'Walk in the "park"',
      submittedAt: '2024-02-10T10:00:00Z'
    };

    // Access the private method through any to test HTML escaping
    const emailServiceAny = emailService as any;
    const template = emailServiceAny.generateEmailTemplate(planSubmission);

    expect(template).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(template).toContain('&lt;b&gt;Dinner&lt;/b&gt;');
    expect(template).toContain('Movie &amp; Popcorn');
    expect(template).toContain('Walk in the &quot;park&quot;');
  });

  test('should format dates correctly', async () => {
    const planSubmission: PlanSubmission = {
      name: 'Test User',
      date: '2024-02-14',
      time: '19:00',
      activities: ['Dinner'],
      submittedAt: '2024-02-10T15:30:00Z'
    };

    const emailServiceAny = emailService as any;
    const template = emailServiceAny.generateEmailTemplate(planSubmission);

    // Should contain formatted date (check for 2024 and February)
    expect(template).toContain('2024');
    expect(template).toContain('February');
    // Should contain the time
    expect(template).toContain('19:00');
  });
});