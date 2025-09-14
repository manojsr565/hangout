import { EmailClient } from '@azure/communication-email';
import { InvocationContext } from '@azure/functions';
import { PlanSubmission, EmailNotification } from '../types';

export class EmailService {
  private client: EmailClient;
  private fromAddress: string;
  private toAddress: string;

  constructor() {
    const connectionString = process.env.COMMUNICATION_SERVICES_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error('COMMUNICATION_SERVICES_CONNECTION_STRING environment variable is required');
    }

    this.client = new EmailClient(connectionString);
    
    this.fromAddress = process.env.EMAIL_FROM_ADDRESS || 'DoNotReply@your-domain.com';
    this.toAddress = process.env.EMAIL_TO_ADDRESS || 'notifications@your-domain.com';
  }

  /**
   * Send email notification for a plan submission
   */
  async sendPlanNotification(planSubmission: PlanSubmission, context: InvocationContext): Promise<boolean> {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        attempt++;
        context.log(`Attempting to send email notification (attempt ${attempt}/${maxRetries})`);

        const emailContent = this.generateEmailContent(planSubmission);
        
        const emailMessage = {
          senderAddress: this.fromAddress,
          content: {
            subject: emailContent.subject,
            html: emailContent.htmlContent,
          },
          recipients: {
            to: [{ address: this.toAddress }],
          },
        };

        const poller = await this.client.beginSend(emailMessage);
        const result = await poller.pollUntilDone();

        if (result.status === 'Succeeded') {
          context.log('Email notification sent successfully', {
            messageId: result.id,
            planName: planSubmission.name,
            planDate: planSubmission.date
          });
          return true;
        } else {
          throw new Error(`Email send failed with status: ${result.status}`);
        }

      } catch (error) {
        context.log(`Email send attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries) {
          context.log('All email send attempts failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            planName: planSubmission.name,
            planDate: planSubmission.date
          });
          return false;
        }

        // Wait before retry (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        await this.sleep(delay);
      }
    }

    return false;
  }

  /**
   * Generate email content from plan submission
   */
  private generateEmailContent(planSubmission: PlanSubmission): { subject: string; htmlContent: string } {
    const subject = `New Dating Plan Submitted: ${planSubmission.name}`;
    const htmlContent = this.generateEmailTemplate(planSubmission);
    
    return { subject, htmlContent };
  }

  /**
   * Generate HTML email template
   */
  private generateEmailTemplate(plan: PlanSubmission): string {
    const activitiesList = plan.activities.map(activity => `<li>${this.escapeHtml(activity)}</li>`).join('');
    const customActivitySection = plan.customActivity 
      ? `<p><strong>Custom Activity:</strong> ${this.escapeHtml(plan.customActivity)}</p>`
      : '';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Dating Plan Submission</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
            background-color: #e91e63;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 10px 10px 0 0;
            margin: -30px -30px 20px -30px;
        }
        .plan-details {
            background-color: #f9f9f9;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .activities {
            background-color: #fff3e0;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
        }
        .activities ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        .activities li {
            margin: 5px 0;
        }
        .metadata {
            font-size: 0.9em;
            color: #666;
            border-top: 1px solid #eee;
            padding-top: 15px;
            margin-top: 20px;
        }
        .highlight {
            background-color: #fff9c4;
            padding: 2px 4px;
            border-radius: 3px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>💕 New Dating Plan Submitted!</h1>
        </div>
        
        <p>A new dating plan has been submitted through your app. Here are the details:</p>
        
        <div class="plan-details">
            <h2>Plan Details</h2>
            <p><strong>Name:</strong> <span class="highlight">${this.escapeHtml(plan.name)}</span></p>
            <p><strong>Date:</strong> <span class="highlight">${this.formatDate(plan.date)}</span></p>
            <p><strong>Time:</strong> <span class="highlight">${this.escapeHtml(plan.time)}</span></p>
        </div>
        
        <div class="activities">
            <h3>Selected Activities</h3>
            <ul>
                ${activitiesList}
            </ul>
            ${customActivitySection}
        </div>
        
        <div class="metadata">
            <h3>Submission Information</h3>
            <p><strong>Submitted At:</strong> ${this.formatDateTime(plan.submittedAt)}</p>
            <p><strong>User Agent:</strong> ${this.escapeHtml(plan.userAgent || 'Unknown')}</p>
            <p><strong>IP Address:</strong> ${this.escapeHtml(plan.ipAddress || 'Unknown')}</p>
        </div>
        
        <p style="margin-top: 30px; font-style: italic; color: #666;">
            This email was automatically generated by your Dating Planner app.
        </p>
    </div>
</body>
</html>`;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Format date for display
   */
  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  }

  /**
   * Format datetime for display
   */
  private formatDateTime(dateTimeString: string): string {
    try {
      const date = new Date(dateTimeString);
      return date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
    } catch {
      return dateTimeString;
    }
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}