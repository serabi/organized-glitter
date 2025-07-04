import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useMetadata } from '@/contexts/MetadataContext';
import { useAdvancedProjects } from '@/hooks/queries/useAdvancedProjects';

import AdvancedEditTable from '@/components/advanced/AdvancedEditTable/index';
import AdvancedFilters from '@/components/advanced/AdvancedFilters';
import useAdvancedFilters from '@/hooks/useAdvancedFilters';
import ProjectPagination from '@/components/ui/ProjectPagination';
import { AdvancedEditHeader } from '@/components/advanced/AdvancedEditHeader';
import { AdvancedEditSummary } from '@/components/advanced/AdvancedEditSummary';

// Custom hooks
import { useAdvancedEditSelection } from '@/hooks/useAdvancedEditSelection';
import { useAdvancedEditPagination } from '@/hooks/useAdvancedEditPagination';
import { useAdvancedEditActions } from '@/hooks/useAdvancedEditActions';
import { secureLogger } from '../utils/secureLogger';

const AdvancedEdit = () => {
  // Hooks
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  // Data fetching
  const { data, isLoading: loading, error } = useAdvancedProjects(user?.id);
  const projects = data?.projects || [];

  // Metadata
  const { companies, artists, tags, companyNames, artistNames } = useMetadata();
  const allCompanies = Array.isArray(companies) ? companies : [];
  const allArtists = Array.isArray(artists) ? artists : [];
  const allTags = useMemo(() => (Array.isArray(tags) ? tags : []), [tags]);

  // View state
  const [showImages, setShowImages] = useState(false);
  const [showMiniKits, setShowMiniKits] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [showDestashed, setShowDestashed] = useState(false);

  // URL parameters
  const companyParam = searchParams.get('company');
  const artistParam = searchParams.get('artist');
  const tagParam = searchParams.get('tag');

  // Advanced filtering logic
  const {
    filteredProjects: allFilteredProjects,
    filters,
    setFilters,
    sortConfig,
    setSortConfig,
    availableFilters,
  } = useAdvancedFilters(projects, showArchived, showDestashed, showMiniKits);

  // Custom hooks
  const pagination = useAdvancedEditPagination(allFilteredProjects);
  const selection = useAdvancedEditSelection();
  const actions = useAdvancedEditActions(selection, allFilteredProjects);

  // Handle React Query error state
  useEffect(() => {
    if (error) {
      secureLogger.error('AdvancedEdit: Error loading projects', error);
      toast({
        title: 'Error loading projects',
        description: 'Please try refreshing the page',
        variant: 'destructive',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]); // toast is stable from useToast hook

  // Apply URL parameter filters when projects load
  useEffect(() => {
    if (projects.length > 0) {
      if (companyParam) {
        setFilters(prevFilters => ({
          ...prevFilters,
          company: companyParam,
        }));
      }

      if (artistParam) {
        setFilters(prevFilters => ({
          ...prevFilters,
          artist: artistParam,
        }));
      }

      if (tagParam) {
        setFilters(prevFilters => ({
          ...prevFilters,
          tag: tagParam,
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects.length, companyParam, artistParam, tagParam]); // setFilters is stable from useState

  if (loading) {
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

        <AdvancedFilters
          filters={filters}
          setFilters={setFilters}
          availableFilters={availableFilters}
          loading={loading}
          showImages={showImages}
          onShowImagesChange={setShowImages}
          showMiniKits={showMiniKits}
          onShowMiniKitsChange={setShowMiniKits}
          showArchived={showArchived}
          onShowArchivedChange={setShowArchived}
          showDestashed={showDestashed}
          onShowDestashedChange={setShowDestashed}
        />

        <AdvancedEditSummary
          totalItems={pagination.totalItems}
          paginatedProjects={pagination.paginatedProjects}
          selectedCount={selection.selectedCount}
          onClearSelection={selection.clearSelection}
          onSelectAll={() => selection.selectAllOnPage(pagination.paginatedProjects)}
        />

        <div className="rounded-md border">
          <AdvancedEditTable
            projects={pagination.paginatedProjects}
            loading={loading}
            sortConfig={sortConfig}
            onSortChange={setSortConfig}
            showImages={showImages}
            selectedProjects={selection.selectedProjects}
            onSelectProject={selection.selectProject}
            onSelectAll={() => selection.toggleSelectAll(pagination.paginatedProjects)}
            onProjectUpdate={actions.handleProjectUpdate}
            onBulkDelete={actions.handleBulkDelete}
            availableCompanies={allCompanies}
            availableArtists={allArtists}
            availableTags={allTags}
          />
        </div>

        {pagination.totalPages > 1 && (
          <ProjectPagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            pageSize={pagination.pageSize}
            onPageChange={pagination.handlePageChange}
            onPageSizeChange={pagination.handlePageSizeChange}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default AdvancedEdit;
