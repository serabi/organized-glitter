/**
 * Advanced Edit page component providing table-based project editing with server-side filtering
 * @author @serabi
 * @created 2025-07-09
 */

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/queries/useProjects';
import { useFilterStateOnly, usePagination } from '@/contexts/FilterHooks';

import AdvancedEditTable from '@/components/advanced/AdvancedEditTable/index';
import AdvancedFilters from '@/components/advanced/AdvancedFilters';
import ProjectPagination from '@/components/ui/ProjectPagination';
import { AdvancedEditHeader } from '@/components/advanced/AdvancedEditHeader';
import { AdvancedEditSummary } from '@/components/advanced/AdvancedEditSummary';

// Custom hooks
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('AdvancedEdit');

const AdvancedEdit = () => {
  // Hooks
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  // Server-side filter state and metadata
  const { filters, debouncedSearchTerm, isInitialized, isMetadataLoading, companies, artists } =
    useFilterStateOnly();
  const { currentPage, pageSize, updatePage, updatePageSize } = usePagination();

  // Memoized filter dependencies to prevent excessive re-renders
  const memoizedFilters = useMemo(
    () => ({
      status: filters.activeStatus,
      company: filters.selectedCompany,
      artist: filters.selectedArtist,
      drillShape: filters.selectedDrillShape,
      yearFinished: filters.selectedYearFinished,
      includeMiniKits: filters.includeMiniKits,
      includeDestashed: filters.includeDestashed,
      includeArchived: filters.includeArchived,
      searchTerm: debouncedSearchTerm,
      selectedTags: filters.selectedTags,
    }),
    [
      filters.activeStatus,
      filters.selectedCompany,
      filters.selectedArtist,
      filters.selectedDrillShape,
      filters.selectedYearFinished,
      filters.includeMiniKits,
      filters.includeDestashed,
      filters.includeArchived,
      debouncedSearchTerm,
      filters.selectedTags,
    ]
  );

  // Metadata from FilterProvider (already in consistent ID-based format)
  const allCompanies = useMemo(
    () => (Array.isArray(companies) ? companies.map(c => ({ id: c.id, name: c.name })) : []),
    [companies]
  );
  const allArtists = useMemo(
    () => (Array.isArray(artists) ? artists.map(a => ({ id: a.id, name: a.name })) : []),
    [artists]
  );

  // Data fetching with server-side filtering
  const {
    data,
    isLoading: loading,
    error,
  } = useProjects(
    {
      userId: user?.id,
      filters: memoizedFilters,
      sortField: filters.sortField,
      sortDirection: filters.sortDirection,
      currentPage,
      pageSize,
      enabled: isInitialized && !!user?.id,
    },
    allCompanies,
    allArtists
  );

  const projects = data?.projects || [];
  const totalItems = data?.totalItems || 0;
  const totalPages = data?.totalPages || 0;

  // View state
  const [showImages, setShowImages] = useState(false);

  // Handle React Query error state
  useEffect(() => {
    if (error) {
      logger.error('AdvancedEdit: Error loading projects', error);
      toast({
        title: 'Error loading projects',
        description: 'Please try refreshing the page',
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  if (loading || !isInitialized || isMetadataLoading) {
    return (
      <MainLayout>
        <div className="p-6">
          <div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-gray-900"></div>
              <p className="text-gray-600">Loading projects...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex-1 space-y-6 p-4 md:p-6">
        {/* Read-only notice banner */}
        <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                Currently read-only - editing features coming soon! Click on individual projects to
                edit them.
              </p>
            </div>
          </div>
        </div>

        <AdvancedEditHeader />

        <AdvancedFilters showImages={showImages} onShowImagesChange={setShowImages} />

        <AdvancedEditSummary totalItems={totalItems} paginatedProjects={projects} />

        <div className="rounded-md border">
          <AdvancedEditTable
            projects={projects}
            loading={loading}
            showImages={showImages}
            availableCompanies={allCompanies}
            availableArtists={allArtists}
          />
        </div>

        {totalPages > 1 && (
          <ProjectPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={updatePage}
            onPageSizeChange={updatePageSize}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default AdvancedEdit;
