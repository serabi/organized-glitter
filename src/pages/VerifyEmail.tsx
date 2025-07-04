import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { confirmEmailVerification } from '@/services/auth';
import { CheckCircle, XCircle, ArrowLeft, Mail } from 'lucide-react';
import { logger } from '@/utils/logger';

const VerifyEmail = () => {
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { token } = useParams<{ token: string }>();

  // Automatically verify on mount
  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setError('Invalid or missing verification token');
        setLoading(false);
        toast({
          title: 'Invalid verification link',
          description: 'The verification link is invalid or has expired',
          variant: 'destructive',
        });
        return;
      }

      try {
        setLoading(true);
        const result = await confirmEmailVerification(token);

        if (result.success) {
          setSuccess(true);
          toast({
            title: 'Email verified successfully',
            description: 'Your email has been verified. You can now log in to your account.',
          });

          // Redirect to login after 3 seconds
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        } else {
          setError(result.error || 'Failed to verify email');
          toast({
            title: 'Verification failed',
            description: result.error || 'Failed to verify email. Please try again.',
            variant: 'destructive',
          });
        }
      } catch (err) {
        logger.error('Email verification error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to verify email';
        setError(errorMessage);
        toast({
          title: 'Verification failed',
          description: errorMessage,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    verifyEmail();
  }, [token, navigate, toast]);

  return (
    <MainLayout>
      <div className="diamond-pattern flex min-h-[80vh] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Email Verification</h1>
            <p className="mt-2 text-muted-foreground">
              {loading && 'Verifying your email address...'}
              {success && 'Your email has been successfully verified'}
              {error && 'There was a problem verifying your email'}
            </p>
          </div>

          <Card className="glass-card mx-auto w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                {loading && <Mail className="h-6 w-6" />}
                {success && <CheckCircle className="h-6 w-6 text-green-600" />}
                {error && <XCircle className="h-6 w-6 text-red-600" />}
                {loading && 'Verifying Email...'}
                {success && 'Email Verified!'}
                {error && 'Verification Failed'}
              </CardTitle>
              <CardDescription>
                {loading && 'Please wait while we verify your email address'}
                {success && 'Your account is now fully activated'}
                {error && "We couldn't verify your email address"}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="py-4 text-center">
                {loading && (
                  <div className="space-y-4">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <p className="text-sm text-muted-foreground">Verifying your email address...</p>
                  </div>
                )}

                {success && (
                  <div className="space-y-4">
                    <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
                    <div>
                      <p className="mb-2">Your email has been successfully verified!</p>
                      <p className="text-sm text-muted-foreground">
                        You can now log in to your account and start using Organized Glitter.
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        You will be redirected to the login page in a few seconds...
                      </p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="space-y-4">
                    <XCircle className="mx-auto h-12 w-12 text-red-600" />
                    <div>
                      <p className="mb-2 font-medium text-red-600">Verification Failed</p>
                      <p className="mb-4 text-sm text-muted-foreground">{error}</p>
                      <div className="space-y-2">
                        <Button
                          onClick={() => navigate('/email-confirmation')}
                          className="w-full"
                          variant="default"
                        >
                          Request New Verification Email
                        </Button>
                        <Button
                          onClick={() => navigate('/login')}
                          className="w-full"
                          variant="outline"
                        >
                          Back to Login
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>

            {!loading && !error && (
              <div className="px-6 pb-6">
                <div className="w-full text-center">
                  <Button
                    variant="link"
                    onClick={() => navigate('/login')}
                    className="text-accent hover:underline"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Login
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default VerifyEmail;
