import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { safeEnv } from '@/utils/safe-env';

import { sendFeedbackEmail } from '../lib/feedback-email-service';

interface FeedbackDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title?: string;
  subtitle?: string;
  eventId?: string;
  name?: string;
  email?: string;
  submitButtonText?: string;
  successMessage?: string;
  currentPage?: string;
}

/**
 * A custom feedback dialog that allows users to submit feedback
 */
export function FeedbackDialog({
  isOpen,
  onOpenChange,
  title = 'Share Your Feedback',
  subtitle = "We'd like to hear from you! If you'd like a response to your message, please include your email address.",
  eventId,
  name = '',
  email = '',
  submitButtonText = 'Submit Feedback',
  successMessage = 'Thank you for your message!',
  currentPage,
}: FeedbackDialogProps) {
  const [userName, setUserName] = useState(name);
  const [userEmail, setUserEmail] = useState(email);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Send feedback via email
      const result = await sendFeedbackEmail({
        message: message.trim(),
        name: userName || 'Anonymous User',
        email: userEmail,
        eventId,
        currentPage,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to send feedback');
      }

      if (safeEnv.isDev) {
        safeEnv.log('Feedback submitted successfully via email service');
      }

      // Show success state
      setIsSubmitted(true);

      // Success state will be shown in the dialog UI

      // Close dialog after a delay
      setTimeout(() => {
        onOpenChange(false);
        // Reset after closing
        setTimeout(() => {
          setIsSubmitted(false);
          setMessage('');
        }, 300);
      }, 4000);
    } catch (error) {
      if (safeEnv.isDev) {
        safeEnv.log('Failed to submit feedback:', error);
      } else {
        console.error('Failed to submit feedback:', error);
      }

      // Error handling will be shown in the dialog UI if needed
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          {!isSubmitted && (
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{subtitle}</DialogDescription>
            </DialogHeader>
          )}

          {isSubmitted ? (
            <div className="py-8 text-center">
              <p className="text-lg font-medium text-primary">{successMessage}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                If you left your email address, we'll be in touch.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  placeholder="Your name (optional)"
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={userEmail}
                  onChange={e => setUserEmail(e.target.value)}
                  placeholder="Your email (optional)"
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="message" className="text-right">
                  Message
                </Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Please share your thoughts, suggestions, or report an issue"
                  className="col-span-3 min-h-[120px]"
                  required
                />
              </div>
            </div>
          )}

          {!isSubmitted && (
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting || !message.trim()}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitButtonText}
              </Button>
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default FeedbackDialog;
