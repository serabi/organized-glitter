// filepath: /Users/sarahwolffmilligan/Development/lovable/organized-glitter/src/lib/user-feedback.ts
// filepath: /Users/sarahwolffmilligan/Development/lovable/organized-glitter/src/lib/user-feedback.ts
import { safeEnv } from '../utils/safe-env';
import { create } from 'zustand';
import { sendFeedbackEmail } from './feedback-email-service';
import { logger } from '@/utils/logger';

/**
 * Configuration options for the User Report Dialog
 */
export interface UserReportOptions {
  /** Optional event ID to associate feedback with a specific error */
  eventId?: string;

  /** User's name */
  name?: string;

  /** User's email */
  email?: string;

  /** Custom title for the dialog */
  title?: string;

  /** Custom subtitle for the dialog */
  subtitle?: string;

  /** Label for the submit button */
  submitButtonText?: string;

  /** Message shown when feedback is successfully submitted */
  successMessage?: string;

  /** Theme for the dialog (system, light, or dark) */
  theme?: 'system' | 'light' | 'dark';
}

/**
 * State interface for the feedback dialog
 */
export interface FeedbackDialogState {
  /** Whether the dialog is open */
  isOpen: boolean;

  /** Options for the dialog */
  options: UserReportOptions;

  /** Open the dialog with the given options */
  openDialog: (options: UserReportOptions) => void;

  /** Close the dialog */
  closeDialog: () => void;
}

/**
 * Store for managing the feedback dialog state
 */
export const useFeedbackDialog = create<FeedbackDialogState>(set => ({
  isOpen: false,
  options: {},
  openDialog: options => set({ isOpen: true, options }),
  closeDialog: () => set({ isOpen: false }),
}));

/**
 * Show a user feedback dialog to collect information about errors or general feedback
 *
 * @param options Configuration options for the dialog
 * @returns void
 *
 * @example
 * // Show dialog after capturing an error
 * try {
 *   // Some code that might throw
 * } catch (error) {
 *   showUserReportDialog({ eventId: 'generated-event-id' });
 * }
 *
 * @example
 * // Show dialog for general feedback
 * showUserReportDialog({
 *   title: 'Share Your Feedback',
 *   subtitle: 'We\'d love to hear what you think about Organized Glitter!'
 * });
 */
export const showUserReportDialog = (options: UserReportOptions = {}) => {
  try {
    // Default theme based on system preference
    const defaultTheme =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';

    // Merge options with defaults
    const dialogOptions = {
      title: options.title || 'Report a Problem',
      subtitle: options.subtitle || "Tell us what happened and we'll do our best to fix it.",
      submitButtonText: options.submitButtonText || 'Submit Feedback',
      successMessage: options.successMessage || 'Thank you for your feedback!',
      theme: options.theme || defaultTheme,
      ...options,
    };

    // Log in dev
    if (safeEnv.isDev) {
      safeEnv.log('Showing user report dialog with options:', dialogOptions);
    }

    // Use our custom dialog for user feedback
    useFeedbackDialog.getState().openDialog(dialogOptions);
  } catch (error) {
    logger.error('Failed to show user report dialog:', error);
  }
};

/**
 * Programmatically submit user feedback (without showing a dialog)
 * For use with custom feedback forms
 *
 * @param message The feedback message (required)
 * @param name Optional user name
 * @param email Optional user email
 * @param eventId Optional event ID to associate with an error
 * @returns void
 */
export const submitUserFeedback = async (
  message: string,
  name?: string,
  email?: string,
  eventId?: string
) => {
  if (!message) {
    logger.error('Feedback message is required');
    return;
  }

  try {
    // First try the direct API approach for more reliable submission
    await sendFeedbackEmail({
      message,
      name: name || 'Anonymous User',
      email,
      eventId,
      currentPage: typeof window !== 'undefined' ? window.location.href : undefined,
    });

    if (safeEnv.isDev) {
      safeEnv.log('User feedback submitted successfully via feedback-email-service:', {
        message,
        name,
        email,
        eventId,
      });
    }
  } catch (directApiError) {
    if (safeEnv.isDev) {
      safeEnv.log('feedback-email-service submission failed.', directApiError);
    }
    logger.error('Failed to submit user feedback via feedback-email-service:', directApiError);
  }
};
