import { FC, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import MainLayout from '@/components/layout/MainLayout';
import LoadingState from '@/components/projects/LoadingState';

interface EditProjectAuthCheckProps {
  authLoading: boolean;
  isAuthenticated: boolean;
  projectId: string | undefined;
  children: React.ReactNode;
}

export const EditProjectAuthCheck: FC<EditProjectAuthCheckProps> = ({
  authLoading,
  isAuthenticated,
  projectId,
  children,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  // Handle unauthenticated state and redirect
  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      toast({
        title: 'Authentication Required',
        description: 'You must be signed in to edit projects',
        variant: 'destructive',
      });
      const returnUrl = `/projects/${projectId}/edit`;
      navigate('/login', { state: { returnUrl } });
      setShouldRedirect(true);
    }
  }, [isAuthenticated, authLoading, projectId, navigate, toast]);

  // Handle loading states
  if (authLoading) {
    return (
      <MainLayout isAuthenticated={false} showLoader={true}>
        <div className="container mx-auto px-4 py-6">
          <LoadingState message="Checking authentication..." />
        </div>
      </MainLayout>
    );
  }

  // Handle unauthenticated state
  if (!isAuthenticated || shouldRedirect) {
    return null; // The useEffect will handle the redirect
  }

  return <>{children}</>;
};
