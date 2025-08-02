/**
 * Tag List page component
 * @author @serabi
 * @created 2025-01-09
 */

import { useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useToast } from '@/hooks/use-toast';
import TagPageHeader from '@/components/tags/TagPageHeader';
import TagTable from '@/components/tags/TagTable';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Home } from 'lucide-react';
import { useMetadata } from '@/contexts/useMetadata';

/**
 * TagList Component
 *
 * Main page component for managing tags. Uses MetadataContext to access
 * cached tags data, preventing duplicate API calls.
 */
const TagList = () => {
  const { toast } = useToast();
  const { tags, isLoading, error } = useMetadata();
  const loading = isLoading.tags;

  // Handle errors from React Query - only fire toast when error state changes
  useEffect(() => {
    if (error.tags) {
      toast({
        title: 'Error',
        description: 'Could not load tags',
        variant: 'destructive',
      });
    }
  }, [error.tags, toast]);

  const handleTagAdded = () => {
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
              <BreadcrumbPage>Tags</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <TagPageHeader onTagAdded={handleTagAdded} />

        <div className="rounded-lg bg-card text-card-foreground shadow">
          <TagTable tags={tags} loading={loading} />
        </div>
      </div>
    </MainLayout>
  );
};

export default TagList;
