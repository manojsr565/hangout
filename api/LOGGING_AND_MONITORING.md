# Logging and Monitoring Implementation

This document describes the logging and monitoring implementation for the Azure Functions API.

## Overview

The implementation includes:
1. **Application Insights Integration** - Structured telemetry and monitoring
2. **Structured Logging** - Consistent, searchable log format
3. **Health Check Endpoint** - Basic system health monitoring

## Application Insights Integration

### Configuration

Application Insights is configured through:
- **Terraform**: `azurerm_application_insights` resource in `terraform/main.tf`
- **Function App Settings**: Connection string automatically configured
- **host.json**: Sampling and logging configuration
- **Logger Utility**: Custom telemetry tracking

### Telemetry Types

The system tracks the following telemetry:

1. **Traces**: Structured log messages with severity levels
2. **Events**: Custom business events (plan submissions, email notifications)
3. **Dependencies**: External service calls (email delivery)
4. **Exceptions**: Error tracking with stack traces
5. **Metrics**: Performance counters and business metrics

## Structured Logging

### Logger Utility (`src/utils/logger.ts`)

The `Logger` class provides structured logging with the following features:

- **Dual Output**: Logs to both Azure Functions context and Application Insights
- **Structured Data**: Consistent format with properties and metrics
- **Event Tracking**: Specialized methods for business events
- **Telemetry Correlation**: Automatic correlation with Application Insights

### Log Levels

- **info**: Normal operations, successful events
- **warn**: Non-critical issues, validation failures
- **error**: Errors, exceptions, failed operations
- **debug**: Detailed debugging information

### Usage Examples

```typescript
import { Logger } from '../utils/logger';

const logger = new Logger(context);

// Basic logging
logger.log({
  level: 'info',
  message: 'Operation completed',
  properties: { userId: '123', operation: 'create' },
  metrics: { duration: 150 }
});

// Email event logging
logger.logEmailEvent('success', {
  recipientEmail: 'user@example.com',
  planSubmissionId: 'sub_123',
  duration: 1500
});

// Plan submission logging
logger.logPlanSubmission('sub_123', {
  name: 'John Doe',
  date: '2024-02-14',
  activitiesCount: 3,
  hasCustomActivity: true
});

// API request logging
logger.logApiRequest('/api/submitPlan', 'POST', 200, 150);
```

## Health Check Endpoint

### Endpoint Details

- **URL**: `/api/health`
- **Method**: GET
- **Authentication**: Anonymous
- **Response Format**: JSON

### Health Checks

The endpoint performs the following checks:

1. **Application Insights**: Validates connection string configuration
2. **Communication Services**: Validates email service configuration
3. **Runtime**: Checks Node.js version and memory usage

### Response Format

```json
{
  "status": "healthy|unhealthy",
  "timestamp": "2024-02-14T10:30:00.000Z",
  "version": "1.0.0",
  "environment": "production",
  "checks": {
    "applicationInsights": {
      "status": "healthy|warning|unhealthy",
      "message": "Status description"
    },
    "communicationServices": {
      "status": "healthy|unhealthy",
      "message": "Status description"
    },
    "runtime": {
      "status": "healthy|warning|unhealthy",
      "message": "Runtime information"
    }
  }
}
```

### Status Codes

- **200**: All systems healthy
- **503**: Critical systems unhealthy or health check failed

## Configuration

### Environment Variables

Required for full monitoring functionality:

```bash
# Application Insights (automatically set by Terraform)
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=...

# Communication Services (automatically set by Terraform)
COMMUNICATION_SERVICES_CONNECTION_STRING=endpoint=...
EMAIL_FROM_ADDRESS=noreply@domain.com
EMAIL_TO_ADDRESS=notifications@domain.com
```

### host.json Configuration

```json
{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "maxTelemetryItemsPerSecond": 20,
        "excludedTypes": "Request"
      },
      "enableLiveMetricsFilters": true
    },
    "logLevel": {
      "default": "Information",
      "Host.Results": "Information",
      "Function": "Information",
      "Host.Aggregator": "Information"
    }
  },
  "functionTimeout": "00:05:00",
  "healthMonitor": {
    "enabled": true,
    "healthCheckInterval": "00:00:10",
    "healthCheckWindow": "00:02:00",
    "healthCheckThreshold": 6,
    "counterThreshold": 0.80
  }
}
```

## Monitoring Queries

### Application Insights KQL Queries

**Plan Submissions Over Time**:
```kql
customEvents
| where name == "PlanSubmission"
| summarize count() by bin(timestamp, 1h)
| render timechart
```

**Email Delivery Success Rate**:
```kql
customEvents
| where name startswith "EmailNotification"
| summarize 
    Total = count(),
    Success = countif(name == "EmailNotificationSuccess"),
    Failure = countif(name == "EmailNotificationFailure")
| extend SuccessRate = (Success * 100.0) / Total
```

**API Response Times**:
```kql
dependencies
| where name startswith "POST /api/"
| summarize avg(duration), percentile(duration, 95) by name
| render barchart
```

**Error Analysis**:
```kql
traces
| where severityLevel >= 2  // Warning and above
| summarize count() by message, severityLevel
| order by count_ desc
```

## Testing

The logging and monitoring implementation includes comprehensive tests:

- **Unit Tests**: Logger utility functionality
- **Integration Tests**: End-to-end logging in functions
- **Health Check Tests**: Endpoint validation and error handling

Run tests with:
```bash
npm test
```

## Troubleshooting

### Common Issues

1. **Missing Telemetry**: Check Application Insights connection string
2. **Health Check Failures**: Verify environment variable configuration
3. **Log Correlation**: Ensure proper context passing to Logger constructor

### Debug Mode

Enable verbose logging by setting log level to "Debug" in host.json:

```json
{
  "logging": {
    "logLevel": {
      "default": "Debug"
    }
  }
}
```

## Performance Considerations

- **Sampling**: Application Insights sampling is enabled to control costs
- **Async Logging**: Telemetry is sent asynchronously to avoid blocking
- **Flush on Exit**: Logger.flush() ensures telemetry is sent before function completion
- **Rate Limiting**: Maximum 20 telemetry items per second configured

## Security

- **No PII Logging**: Personal information is excluded from logs
- **Sanitized Data**: All logged data is sanitized and validated
- **Access Control**: Application Insights access controlled via Azure RBAC