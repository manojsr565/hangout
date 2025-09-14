# Email Notification Service

This service handles sending email notifications when users submit dating plans through the app.

## Features

- **Azure Communication Services Integration**: Uses Azure's email service for reliable delivery
- **HTML Email Templates**: Rich, responsive email templates with plan details
- **Error Handling & Retry Logic**: Automatic retry with exponential backoff (3 attempts)
- **Input Sanitization**: Prevents XSS attacks by escaping HTML in user input
- **Structured Logging**: Comprehensive logging for debugging and monitoring

## Configuration

The service requires the following environment variables:

- `COMMUNICATION_SERVICES_CONNECTION_STRING`: Azure Communication Services connection string
- `EMAIL_FROM_ADDRESS`: Sender email address (optional, defaults to DoNotReply@your-domain.com)
- `EMAIL_TO_ADDRESS`: Recipient email address (optional, defaults to notifications@your-domain.com)

## Usage

```typescript
import { EmailService } from './services/emailService';

const emailService = new EmailService();
const success = await emailService.sendPlanNotification(planSubmission, context);
```

## Email Template

The service generates a responsive HTML email template that includes:

- Plan submitter's name
- Date and time of the planned date
- Selected activities list
- Custom activity (if provided)
- Submission metadata (timestamp, user agent, IP address)

## Error Handling

The service implements robust error handling:

1. **Retry Logic**: Up to 3 attempts with exponential backoff (2s, 4s, 8s delays)
2. **Graceful Degradation**: Email failures don't cause the entire request to fail
3. **Comprehensive Logging**: All attempts and failures are logged for debugging

## Security

- **HTML Escaping**: All user input is escaped to prevent XSS attacks
- **Input Validation**: Plan data is validated before email generation
- **Connection Security**: Uses Azure's secure communication services

## Testing

The service includes comprehensive unit and integration tests:

```bash
npm test
```

Tests cover:
- Successful email sending
- Error handling and retry logic
- HTML escaping and security
- Date formatting
- Integration with Azure Functions