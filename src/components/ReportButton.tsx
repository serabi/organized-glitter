import { Button } from '@/components/ui/button';
import { useState } from 'react';
import FeedbackDialog from './FeedbackDialog';

interface ReportButtonProps {
  variant?: 'default' | 'outline' | 'destructive' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  associateWithError?: boolean;
  customTitle?: string;
  customSubtitle?: string;
}

/**
 * A button component that opens the email-based feedback dialog
 * Updated to use the new email feedback system
 */
const ReportButton = ({
  variant = 'secondary',
  size = 'sm',
  className = '',
  associateWithError = false,
  customTitle,
  customSubtitle,
}: ReportButtonProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  // Get the event ID if associating with an error
  const eventId = undefined;

  const handleClick = () => {
    setDialogOpen(true);
  };

  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={handleClick}>
        {associateWithError ? 'Report Issue' : 'Send Feedback'}
      </Button>

      <FeedbackDialog
        isOpen={dialogOpen}
        onOpenChange={setDialogOpen}
        title={customTitle || (associateWithError ? 'Report a Problem' : 'Share Your Feedback')}
        subtitle={
          customSubtitle ||
          (associateWithError
            ? 'Help us understand what went wrong.'
            : "We'd love to hear what you think about Organized Glitter!")
        }
        eventId={eventId}
      />
    </>
  );
};

export default ReportButton;
