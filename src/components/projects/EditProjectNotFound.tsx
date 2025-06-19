import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import MainLayout from '@/components/layout/MainLayout';

export const EditProjectNotFound: FC = () => {
  const navigate = useNavigate();

  return (
    <MainLayout isAuthenticated={true}>
      <div className="container mx-auto px-4 py-6">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold">Project Not Found</h1>
          <p className="mb-4">
            The project you're looking for doesn't exist or you don't have permission to edit it.
          </p>
          <Button onClick={() => navigate('/dashboard')}>Return to Dashboard</Button>
        </div>
      </div>
    </MainLayout>
  );
};
