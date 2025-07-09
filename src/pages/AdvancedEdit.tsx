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
import { useAdvancedEditSelection } from '@/hooks/useAdvancedEditSelection';
import { useAdvancedEditActions } from '@/hooks/useAdvancedEditActions';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('AdvancedEdit');

const AdvancedEdit = () => {
  // Hooks
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  // Server-side filter state and metadata
  const {
    filters,
    debouncedSearchTerm,
    isInitialized,
    isMetadataLoading,
    companies,
    artists,
    tags,
  } = useFilterStateOnly();
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

  // Data fetching with server-side filtering
  const {
    data,
    isLoading: loading,
    error,
  } = useProjects({
    userId: user?.id,
    filters: memoizedFilters,
    sortField: filters.sortField,
    sortDirection: filters.sortDirection,
    currentPage,
    pageSize,
    enabled: isInitialized && !!user?.id,
  });

  const projects = data?.projects || [];
  const totalItems = data?.totalItems || 0;
  const totalPages = data?.totalPages || 0;

  // Metadata from FilterProvider (already in consistent ID-based format)
  const allCompanies = Array.isArray(companies) ? companies : [];
  const allArtists = Array.isArray(artists) ? artists : [];
  const allTags = useMemo(() => (Array.isArray(tags) ? tags : []), [tags]);

  // View state
  const [showImages, setShowImages] = useState(false);

  // Custom hooks
  const selection = useAdvancedEditSelection();
  const actions = useAdvancedEditActions(selection, projects);

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
        <AdvancedEditHeader
          onNavigateToNewProject={actions.navigateToNewProject}
          onNavigateToCompanies={actions.navigateToCompanies}
          onNavigateToArtists={actions.navigateToArtists}
          onNavigateToTags={actions.navigateToTags}
        />

        <AdvancedFilters showImages={showImages} onShowImagesChange={setShowImages} />

        <AdvancedEditSummary
          totalItems={totalItems}
          paginatedProjects={projects}
          selectedCount={selection.selectedCount}
          onClearSelection={selection.clearSelection}
          onSelectAll={() => selection.selectAllOnPage(projects)}
        />

        <div className="rounded-md border">
          <AdvancedEditTable
            projects={projects}
            loading={loading}
            showImages={showImages}
            selectedProjects={selection.selectedProjects}
            onSelectProject={selection.selectProject}
            onSelectAll={() => selection.toggleSelectAll(projects)}
            onProjectUpdate={actions.handleProjectUpdate}
            onBulkDelete={actions.handleBulkDelete}
            availableCompanies={allCompanies}
            availableArtists={allArtists}
            availableTags={allTags}
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
