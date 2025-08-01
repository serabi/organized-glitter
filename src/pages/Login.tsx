import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import AuthForm from '@/components/auth/AuthForm';
import SocialLogin from '@/components/auth/SocialLogin';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { loginWithPassword, loginWithOAuth2 } from '@/services/auth';
import { pb } from '@/lib/pocketbase';
import { createLogger } from '@/utils/logger';

const loginLogger = createLogger('Login');

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, isLoading, initialCheckComplete } = useAuth();

  // Check if user is already logged in using auth context
  useEffect(() => {
    // Only redirect if auth is fully loaded and user is authenticated
    if (!isLoading && initialCheckComplete && isAuthenticated) {
      navigate('/overview', { replace: true });
    }
  }, [isAuthenticated, isLoading, initialCheckComplete, navigate]);

  const handleLogin = async (data: { email: string; password: string }) => {
    setLoading(true);
    setError(undefined);

    try {
      const result = await loginWithPassword(data);

      if (!result.success) {
        setError(result.error);
        return;
      }

      toast({
        title: 'Login successful',
        description: 'Welcome back to Organized Glitter!',
      });

      // Debug: Check auth state after successful login
      loginLogger.debug('After successful login - PocketBase auth state:', {
        isValid: pb.authStore.isValid,
        hasRecord: !!pb.authStore.record,
        userId: pb.authStore.record?.id,
      });

      // Navigate immediately after successful login
      // PocketBase authStore is already updated when this callback runs
      navigate('/overview', { replace: true });
    } catch (err) {
      loginLogger.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(undefined);

    try {
      const result = await loginWithOAuth2('google');

      if (!result.success) {
        setError(result.error);
        return;
      }

      toast({
        title: 'Login successful',
        description: 'Welcome back to Organized Glitter!',
      });

      // Navigate immediately after successful OAuth login
      navigate('/overview', { replace: true });
    } catch (err) {
      loginLogger.error('Google login error:', err);
      setError('Failed to login with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDiscordLogin = async () => {
    setLoading(true);
    setError(undefined);

    try {
      const result = await loginWithOAuth2('discord');

      if (!result.success) {
        setError(result.error);
        return;
      }

      toast({
        title: 'Login successful',
        description: 'Welcome back to Organized Glitter!',
      });

      // Navigate immediately after successful OAuth login
      navigate('/overview', { replace: true });
    } catch (err) {
      loginLogger.error('Discord login error:', err);
      setError('Failed to login with Discord. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="diamond-pattern flex min-h-[80vh] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Welcome Back</h1>
            <p className="mt-2 text-muted-foreground">
              Sign in to access your diamond painting collection
            </p>
          </div>

          <AuthForm type="login" onSubmit={handleLogin} loading={loading} error={error} />

          <SocialLogin
            onGoogleLogin={handleGoogleLogin}
            onDiscordLogin={handleDiscordLogin}
            loading={loading}
          />
        </div>
      </div>
    </MainLayout>
  );
};

export default Login;
