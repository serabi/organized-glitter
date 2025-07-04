import { create } from 'zustand';

export interface UserReportOptions {
  eventId?: string;
  name?: string;
  email?: string;
  title?: string;
  subtitle?: string;
  submitButtonText?: string;
  successMessage?: string;
  currentPage?: string;
}

interface FeedbackDialogState {
  isOpen: boolean;
  options: UserReportOptions;
  openDialog: (options: UserReportOptions) => void;
  closeDialog: () => void;
}

export const useFeedbackDialog = create<FeedbackDialogState>(set => ({
  isOpen: false,
  options: {},
  openDialog: options => set({ isOpen: true, options }),
  closeDialog: () => set({ isOpen: false }),
}));

/**
 * Opens the user report dialog with the given options
 * This function replaces the old showUserReportDialog from user-feedback.ts
 *
 * @param options Configuration options for the dialog
 */
export const showUserReportDialog = (options: UserReportOptions = {}) => {
  useFeedbackDialog.getState().openDialog(options);
};
