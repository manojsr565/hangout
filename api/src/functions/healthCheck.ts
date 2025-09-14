import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { Logger } from '../utils/logger';
import { globalRateLimiter } from '../utils/rateLimiter';

export async function healthCheck(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const logger = new Logger(context);
  const startTime = Date.now();

  // Security headers
  const securityHeaders = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  };

  // Apply rate limiting (more lenient for health checks)
  const clientIP = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
  
  const rateLimit = globalRateLimiter.isAllowed(`health-${clientIP}`);
  
  if (!rateLimit.allowed) {
    const duration = Date.now() - startTime;
    logger.log({
      level: 'warn',
      message: 'Rate limit exceeded for health check',
      properties: {
        clientIP: clientIP,
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    });
    
    return {
      status: 429,
      headers: {
        ...securityHeaders,
        'Retry-After': Math.ceil(((rateLimit.resetTime || Date.now()) - Date.now()) / 1000).toString()
      },
      body: JSON.stringify({
        error: 'Rate limit exceeded',
        message: 'Too many health check requests'
      })
    };
  }

  try {
    // Basic health checks
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.AZURE_FUNCTIONS_ENVIRONMENT || 'unknown',
      checks: {
        applicationInsights: checkApplicationInsights(),
        communicationServices: checkCommunicationServices(),
        runtime: checkRuntime()
      }
    };

    // Check if any critical services are down
    const criticalChecks: (keyof typeof healthStatus.checks)[] = ['communicationServices', 'runtime'];
    const failedCriticalChecks = criticalChecks.filter(
      check => healthStatus.checks[check].status !== 'healthy'
    );

    if (failedCriticalChecks.length > 0) {
      healthStatus.status = 'unhealthy';
    }

    const duration = Date.now() - startTime;
    
    // Log health check
    logger.log({
      level: healthStatus.status === 'healthy' ? 'info' : 'warn',
      message: 'Health check completed',
      properties: {
        status: healthStatus.status,
        failedChecks: failedCriticalChecks.join(', ') || 'none',
        duration: duration.toString()
      },
      metrics: {
        healthCheckDuration: duration
      }
    });

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;

    return {
      status: statusCode,
      headers: securityHeaders,
      body: JSON.stringify(healthStatus, null, 2)
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.log({
      level: 'error',
      message: 'Health check failed with exception',
      properties: {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: duration.toString()
      }
    });

    return {
      status: 503,
      headers: securityHeaders,
      body: JSON.stringify({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}

function checkApplicationInsights(): { status: string; message: string } {
  const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
  
  if (!connectionString) {
    return {
      status: 'warning',
      message: 'Application Insights connection string not configured'
    };
  }

  // Basic validation of connection string format
  if (!connectionString.includes('InstrumentationKey=')) {
    return {
      status: 'unhealthy',
      message: 'Invalid Application Insights connection string format'
    };
  }

  return {
    status: 'healthy',
    message: 'Application Insights configured'
  };
}

function checkCommunicationServices(): { status: string; message: string } {
  const connectionString = process.env.COMMUNICATION_SERVICES_CONNECTION_STRING;
  const fromAddress = process.env.EMAIL_FROM_ADDRESS;
  const toAddress = process.env.EMAIL_TO_ADDRESS;

  if (!connectionString) {
    return {
      status: 'unhealthy',
      message: 'Communication Services connection string not configured'
    };
  }

  if (!fromAddress || !toAddress) {
    return {
      status: 'unhealthy',
      message: 'Email addresses not configured'
    };
  }

  // Basic validation of connection string format
  if (!connectionString.includes('endpoint=')) {
    return {
      status: 'unhealthy',
      message: 'Invalid Communication Services connection string format'
    };
  }

  return {
    status: 'healthy',
    message: 'Communication Services configured'
  };
}

function checkRuntime(): { status: string; message: string } {
  try {
    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0]);
    
    if (majorVersion < 18) {
      return {
        status: 'warning',
        message: `Node.js version ${nodeVersion} is below recommended version 18`
      };
    }

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    
    return {
      status: 'healthy',
      message: `Runtime healthy - Node.js ${nodeVersion}, Memory: ${memoryUsageMB}MB`
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Runtime check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

app.http('healthCheck', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: healthCheck
});