/**
 * Advanced View page component that redirects to Advanced Edit
 * @author @serabi
 * @created 2025-07-09
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { createLogger } from '@/utils/secureLogger';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Home, Grid3X3, Edit, PlusCircle } from 'lucide-react';

const logger = createLogger('AdvancedView');

const AdvancedView = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect to AdvancedEdit since functionality has been migrated there
  useEffect(() => {
    logger.info('AdvancedView accessed - redirecting to AdvancedEdit');
    navigate('/advanced-edit', { replace: true });
  }, [navigate]);

  return (
    <MainLayout isAuthenticated={true}>
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" className="flex items-center">
                <Home className="mr-1 h-4 w-4" />
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Advanced View</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Redirect message */}
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <h1 className="mb-4 text-2xl font-bold">Redirecting to Advanced Edit...</h1>
            <p className="mb-6 text-muted-foreground">
              The Advanced View functionality has been migrated to the Advanced Edit page.
            </p>
            <Button onClick={() => navigate('/advanced-edit')}>
              <Edit className="mr-2 h-4 w-4" />
              Go to Advanced Edit
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default AdvancedView;
