import { safeEnv } from '../utils/safe-env';
import { pb } from './pocketbase';
import { logger } from '@/utils/logger';

/**
 * Feedback request payload interface
 */
interface FeedbackRequest {
  feedback: string;
  email?: string;
  type?: 'general' | 'bug' | 'feature' | 'improvement';
  userId?: string;
}

/**
 * Feedback response interface
 */
interface FeedbackResponse {
  success: boolean;
  message?: string;
  error?: string;
  details?: string[];
  retryAfter?: number;
}

/**
 * Function parameters interface
 */
interface SendFeedbackEmailParams {
  message: string;
  name?: string;
  email?: string;
  eventId?: string;
  currentPage?: string;
}

/**
 * Function return type interface
 */
interface SendFeedbackEmailResult {
  success: boolean;
  emailId?: string;
  error?: string;
  note?: string;
}

/**
 * Send feedback via PocketBase SMTP server
 * Uses PocketBase built-in email functionality with custom templates
 */
export async function sendFeedbackEmail({
  message,
  name = 'Anonymous User',
  email,
  eventId,
  currentPage,
}: SendFeedbackEmailParams): Promise<SendFeedbackEmailResult> {
  try {
    // In local development, just log the feedback
    if (
      window.location.hostname === 'localhost' ||
      window.location.hostname.includes('127.0.0.1')
    ) {
      logger.log(
        '%c📧 LOCAL FEEDBACK 📧',
        'background: #4CAF50; color: white; padding: 4px; border-radius: 4px;'
      );
      logger.log({
        message,
        name,
        email,
        eventId,
        currentPage,
        timestamp: new Date().toISOString(),
      });
      logger.log('This feedback would be emailed to sarah@organizedglitter.app in production');

      return { success: true };
    }

    // Input validation
    if (!message || typeof message !== 'string') {
      throw new Error('Message is required and must be a string');
    }

    if (message.length < 10) {
      throw new Error('Message must be at least 10 characters long');
    }

    if (message.length > 5000) {
      throw new Error('Message must be less than 5000 characters');
    }

    // Send via Vercel API feedback endpoint
    logger.log('Sending feedback email via Vercel API...');

    // Get user info if authenticated
    let userId = 'guest';
    let userEmail = email || 'anonymous@example.com';

    if (pb.authStore.isValid && pb.authStore.model) {
      userId = pb.authStore.model.id;
      userEmail = pb.authStore.model.email || userEmail;
    }

    // Validate email format if provided
    if (email && typeof email === 'string') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Invalid email format');
      }
    }

    const feedbackData: FeedbackRequest = {
      feedback: message.trim(),
      email: userEmail,
      type: eventId ? 'bug' : 'general',
      userId: userId,
    };

    // Use Vercel API route for feedback
    const response = await fetch('/api/send-feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(feedbackData),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const responseData = (await response.json()) as FeedbackResponse;

    logger.log('Vercel API feedback response:', responseData);

    if (safeEnv.isDev) {
      safeEnv.log('Feedback email sent successfully:', responseData);
    }

    if (!responseData.success) {
      // Handle specific error cases
      if (responseData.error?.includes('Too many requests')) {
        const retryAfter = responseData.retryAfter ? Math.ceil(responseData.retryAfter / 60) : 15;
        throw new Error(`Rate limit exceeded. Please try again in ${retryAfter} minutes.`);
      }
      throw new Error(responseData.error || 'Failed to send feedback');
    }

    return {
      success: true,
      emailId: 'vercel-api-sent',
    };
  } catch (error) {
    if (safeEnv.isDev) {
      safeEnv.log('Failed to send feedback email:', error);
    } else {
      logger.error('Failed to send feedback email:', error);
    }

    // Fallback to mailto link
    try {
      logger.log('Using mailto fallback...');

      const subject = encodeURIComponent(`Feedback from ${name || 'Anonymous User'}`);
      const body = encodeURIComponent(
        `
Feedback Message:
${message}

User Details:
- Name: ${name || 'Anonymous User'}
- Email: ${email || 'Not provided'}
- Error ID: ${eventId || 'None'}
- Page: ${currentPage || 'Not provided'}
- Submitted: ${new Date().toLocaleString()}

Technical Error: ${error instanceof Error ? error.message : String(error)}
      `.trim()
      );

      const mailtoUrl = `mailto:sarah@organizedglitter.app?subject=${subject}&body=${body}`;
      window.open(mailtoUrl, '_blank');

      return {
        success: true,
        emailId: 'mailto-fallback',
        note: 'API failed, opened your default email client as fallback.',
      };
    } catch (fallbackError) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
