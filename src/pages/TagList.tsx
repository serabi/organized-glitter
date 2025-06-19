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
import { useTags } from '@/hooks/queries/useTags';

const TagList = () => {
  const { toast } = useToast();

  // React Query hooks
  const { data: tags = [], isLoading: loading, error } = useTags();

  // Handle errors from React Query - only fire toast when error state changes
  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: 'Could not load tags',
        variant: 'destructive',
      });
    }
  }, [error, toast]);

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
