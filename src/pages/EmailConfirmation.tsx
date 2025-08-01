import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { logger } from '@/utils/logger';
import { MailCheck } from 'lucide-react';
import { pb } from '@/lib/pocketbase';
import { useToast } from '@/hooks/use-toast';

const EmailConfirmation = () => {
  const [resending, setResending] = useState(false);
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  // Get email from location state or use a generic message
  const [email, setEmail] = useState<string>('your email');

  // Try to get email from location state or session
  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    } else {
      // Try to get the email from the current auth store if available
      if (pb.authStore.isValid && pb.authStore.model?.email) {
        setEmail(pb.authStore.model.email);
      }
    }
  }, [location.state]);

  const handleResendEmail = async () => {
    setResending(true);
    try {
      // PocketBase email verification resend
      await pb.collection('users').requestVerification(email);

      toast({
        title: 'Confirmation email resent',
        description: 'Please check your inbox (and spam folder) for the confirmation email.',
      });
    } catch (error) {
      logger.error('Error resending confirmation email', error);
      toast({
        title: 'Error',
        description: 'Failed to resend confirmation email. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <MainLayout>
      <div className="flex min-h-[80vh] items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-4 text-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-primary/10 p-3">
                <MailCheck className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle>Check Your Email</CardTitle>
            <CardDescription>
              We've sent a confirmation link to{' '}
              <span className="font-medium text-foreground">{email}</span>. Please click the link to
              verify your email address and complete your registration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>Didn't receive the email?</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Check your spam or junk folder</li>
              <li>Make sure you entered the correct email address</li>
              <li>Wait a few minutes for the email to arrive</li>
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              The email will be sent from{' '}
              <span className="font-mono text-foreground">accounts@organizedglitter.app</span>
            </p>
          </CardContent>
          <CardFooter className="flex flex-col space-y-3">
            <Button onClick={handleResendEmail} disabled={resending} className="w-full">
              {resending ? 'Sending...' : 'Resend Confirmation Email'}
            </Button>
            <Button variant="outline" onClick={() => navigate('/login')} className="w-full">
              Back to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    </MainLayout>
  );
};

export default EmailConfirmation;
