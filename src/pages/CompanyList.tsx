/**
 * Company List page component
 * @author @serabi
 * @created 2025-01-09
 */

import { useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useToast } from '@/hooks/use-toast';
import CompanyPageHeader from '@/components/company/CompanyPageHeader';
import CompanyTable from '@/components/company/CompanyTable';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Home } from 'lucide-react';
import { useMetadata } from '@/contexts/MetadataContext';

/**
 * CompanyList Component
 *
 * Main page component for managing companies. Uses MetadataContext to access
 * cached companies data, preventing duplicate API calls.
 */
const CompanyList = () => {
  const { toast } = useToast();

  // Get companies data from MetadataContext (eliminates redundant API call)
  const { companies, isLoading, error } = useMetadata();
  const loading = isLoading.companies;

  // Handle errors from React Query - only fire toast when error state changes
  useEffect(() => {
    if (error.companies) {
      toast({
        title: 'Error',
        description: 'Could not load companies',
        variant: 'destructive',
      });
    }
  }, [error.companies, toast]);

  const handleCompanyAdded = () => {
    // React Query will automatically refetch when invalidated by the mutation
  };

  const handleCompanyUpdated = () => {
    // React Query will automatically refetch when invalidated by the mutation
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">
                <Home className="h-4 w-4" />
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Companies</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <CompanyPageHeader onCompanyAdded={handleCompanyAdded} />

        <div className="rounded-lg bg-card text-card-foreground shadow">
          <CompanyTable
            companies={companies}
            loading={loading}
            onCompanyUpdated={handleCompanyUpdated}
          />
        </div>
      </div>
    </MainLayout>
  );
};

export default CompanyList;
