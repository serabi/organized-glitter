import { create } from 'zustand';
import FeedbackDialog from './FeedbackDialog';

// Create a new store for the feedback dialog - replacing the old one from user-feedback.ts
interface UserReportOptions {
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
 * Provider component that renders the feedback dialog when needed
 * This should be placed near the root of the application
 */
export function FeedbackDialogProvider() {
  // Get dialog state from the store
  const isOpen = useFeedbackDialog(state => state.isOpen);
  const options = useFeedbackDialog(state => state.options);
  const closeDialog = useFeedbackDialog(state => state.closeDialog);

  // Handle dialog open/close
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeDialog();
    }
  };

  return (
    <FeedbackDialog
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      title={options.title}
      subtitle={options.subtitle}
      eventId={options.eventId}
      name={options.name}
      email={options.email}
      submitButtonText={options.submitButtonText}
      successMessage={options.successMessage}
      currentPage={options.currentPage}
    />
  );
}

/**
 * Show a user feedback dialog to collect information about errors or general feedback
 * This function replaces the old showUserReportDialog from user-feedback.ts
 *
 * @param options Configuration options for the dialog
 */
export const showUserReportDialog = (options: UserReportOptions = {}) => {
  useFeedbackDialog.getState().openDialog(options);
};

export default FeedbackDialogProvider;
