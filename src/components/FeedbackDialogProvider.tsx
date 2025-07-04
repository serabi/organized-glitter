import FeedbackDialog from './FeedbackDialog';
import { useFeedbackDialog } from './FeedbackDialogStore';

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


export default FeedbackDialogProvider;
