import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useAdvancedProjects } from '@/hooks/queries/useAdvancedProjects';
import { useToast } from '@/hooks/use-toast';
import { useMetadata } from '@/contexts/MetadataContext';
import { useIsMobile } from '@/hooks/use-mobile';

import ProjectsTable from '@/components/advanced/ProjectsTable';
import AdvancedFilters from '@/components/advanced/AdvancedFilters';
import useAdvancedFilters from '@/hooks/useAdvancedFilters';
import ProjectPagination from '@/components/ui/ProjectPagination';
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

const AdvancedView = () => {
  // Core state
  const [showImages, setShowImages] = useState(false);
  const [showMiniKits, setShowMiniKits] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [showDestashed, setShowDestashed] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Hooks
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Data fetching
  const { data: projectsData, isLoading: loading, error, isError } = useAdvancedProjects(user?.id);

  const projects = projectsData?.projects || [];

  // Metadata
  const { companyNames, artistNames } = useMetadata();
  const allCompanies = Array.isArray(companyNames) ? companyNames : [];
  const allArtists = Array.isArray(artistNames) ? artistNames : [];

  // URL parameters
  const companyParam = searchParams.get('company');
  const artistParam = searchParams.get('artist');
  const tagParam = searchParams.get('tag');
  const pageParam = searchParams.get('page');
  const pageSizeParam = searchParams.get('pageSize');

  // External filters for useAdvancedFilters
  const externalFilters = useMemo(
    () => ({
      companies: allCompanies,
      artists: allArtists,
    }),
    [allCompanies, allArtists]
  );

  // Advanced filtering
  const {
    filteredProjects: allFilteredProjects,
    filters,
    setFilters,
    sortConfig,
    setSortConfig,
    availableFilters,
  } = useAdvancedFilters(projects, showArchived, showDestashed, showMiniKits, externalFilters);

  // Client-side pagination
  const paginatedProjects = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return allFilteredProjects.slice(startIndex, endIndex);
  }, [allFilteredProjects, currentPage, pageSize]);

  // Navigation helpers

  // Update pagination metadata when filtered projects change
  useEffect(() => {
    const totalFilteredItems = allFilteredProjects.length;
    const calculatedTotalPages = Math.ceil(totalFilteredItems / pageSize);

    setTotalItems(totalFilteredItems);
    setTotalPages(calculatedTotalPages);

    // Reset to first page if current page is beyond available pages
    if (currentPage > calculatedTotalPages && calculatedTotalPages > 0) {
      setCurrentPage(1);
    }
  }, [allFilteredProjects.length, pageSize, currentPage]);

  // Handle URL pagination parameters
  useEffect(() => {
    if (pageParam) {
      const page = parseInt(pageParam, 10);
      if (!isNaN(page) && page > 0) {
        setCurrentPage(page);
      }
    }
    if (pageSizeParam) {
      const size = parseInt(pageSizeParam, 10);
      if (!isNaN(size) && size > 0 && size <= 100) {
        setPageSize(size);
      }
    }
  }, [pageParam, pageSizeParam]);

  // Handle React Query errors
  useEffect(() => {
    if (isError && error) {
      console.error('AdvancedView: React Query error:', error);
      toast({
        title: 'Error Loading Projects',
        description: 'Failed to load projects. Please try refreshing the page.',
        variant: 'destructive',
      });
    }
  }, [isError, error, toast]);

  // Apply URL filters when projects load
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
  }, [projects.length, companyParam, artistParam, tagParam, setFilters]);

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', page.toString());
    setSearchParams(newParams);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('pageSize', newPageSize.toString());
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

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

        {/* Header */}
        <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold">Advanced Dashboard View</h1>
            <p className="mt-2 text-muted-foreground">
              View and filter your projects with advanced search capabilities
            </p>
          </div>
          <div className="flex flex-row gap-2">
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              <Grid3X3 className="mr-2 h-4 w-4" />
              {isMobile ? 'Visual View' : 'Visual View'}
            </Button>
            <Button variant="outline" onClick={() => navigate('/advanced-edit')}>
              <Edit className="mr-2 h-4 w-4" />
              {isMobile ? 'Edit' : 'Advanced Edit'}
            </Button>
            <Button onClick={() => navigate('/projects/new')}>
              <PlusCircle className="mr-2 h-4 w-4" />
              {isMobile ? 'New' : 'Add New Project'}
            </Button>
          </div>
        </div>

        {/* Filters */}
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

        {/* Projects Table */}
        <ProjectsTable
          projects={paginatedProjects}
          loading={loading}
          sortConfig={sortConfig}
          onSortChange={setSortConfig}
          showImages={showImages}
        />

        {/* Pagination */}
        {!loading && (
          <ProjectPagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            className="mt-6"
          />
        )}
      </div>
    </MainLayout>
  );
};

export default AdvancedView;
