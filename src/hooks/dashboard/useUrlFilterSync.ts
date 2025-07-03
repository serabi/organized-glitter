import { useEffect } from 'react';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { ProjectFilterStatus } from '../../types/project';
import { DashboardValidSortField } from '@/features/dashboard/dashboard.constants';
import { SortDirectionType } from '@/contexts/DashboardFiltersContext';

interface UseUrlFilterSyncProps {
  // Setters
  setSearchTerm: (term: string | null) => void;
  setSelectedCompany: (company: string | null) => void;
  setSelectedArtist: (artist: string | null) => void;
  setSelectedDrillShape: (shape: string | null) => void;
  setSelectedYearFinished: (year: string | null) => void;
  setSelectedTags: (tags: string[]) => void;
  setIncludeMiniKits: (value: boolean) => void;
  setActiveStatus: (status: ProjectFilterStatus) => void;
  setCurrentPage?: (page: number) => void;
  setPageSize?: (pageSize: number) => void;
  setSortField?: (field: DashboardValidSortField) => void;
  setSortDirection?: (direction: SortDirectionType) => void;

  // Current state values (for reading from URL and comparing)
  activeStatus: ProjectFilterStatus;
  selectedCompany: string;
  selectedArtist: string;
  selectedDrillShape: string;
  selectedYearFinished: string;
  searchTerm: string;
  selectedTags: string[];
  includeMiniKits: boolean;
  currentPage: number;
  pageSize: number;
  sortField: DashboardValidSortField;
  sortDirection: SortDirectionType;

  // Metadata
  artists: { label: string; value: string }[];
  companies: { label: string; value: string }[];
  allTagsContext?: { id: string; name: string }[];
  isMetadataLoading: boolean;
  isLoadingProjects: boolean;
}

const useUrlFilterSync = ({
  // Setters
  setSearchTerm,
  setSelectedCompany,
  setSelectedArtist,
  setSelectedDrillShape,
  setSelectedYearFinished,
  setSelectedTags,
  setIncludeMiniKits,
  setActiveStatus,
  setCurrentPage,
  setPageSize,
  setSortField,
  setSortDirection,
  artists,
  companies,
  allTagsContext,
  isMetadataLoading,
  isLoadingProjects,
  // Current state values (not destructured as they are for comparison/logic, not direct use)
  // activeStatus: currentActiveStatus, // Example if needed to avoid name clash
  // ... and so on for other current state values if needed for comparison logic
}: UseUrlFilterSyncProps): void => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (isMetadataLoading || isLoadingProjects) {
      return;
    }

    // Check if we have a tag parameter but no tags loaded yet - wait for tags to be available
    const urlParams = new URLSearchParams(window.location.search);
    const hasTagParam = urlParams.has('tag') || urlParams.has('tags');
    if (hasTagParam && (!allTagsContext || allTagsContext.length === 0)) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const locationState = location.state as Record<string, string> | null;
    const getParam = (key: string): string | null => locationState?.[key] || params.get(key);

    // Check if we have tag parameters but no tags loaded yet - wait for tags to load
    const tagParam = getParam('tag');
    if (tagParam && (!allTagsContext || allTagsContext.length === 0)) {
      return;
    }

    const artistParam = getParam('artist');
    const companyParam = getParam('company');
    const statusParam = getParam('status');
    const drillShapeParam = getParam('drillShape');
    const yearFinishedParam = getParam('yearFinished');
    const tagsParam = getParam('tags');
    // tagParam already declared above for early validation
    const searchParam = getParam('search');
    const includeMiniKitsParam = getParam('includeMiniKits');
    const pageParam = getParam('page');
    const pageSizeParam = getParam('pageSize');
    const sortFieldParam = getParam('sortField');
    const sortDirParam = getParam('sortDirection');

    if (
      statusParam &&
      [
        'wishlist',
        'purchased',
        'stash',
        'progress',
        'completed',
        'all',
        'destashed',
        'archived',
      ].includes(statusParam)
    ) {
      setActiveStatus(statusParam as ProjectFilterStatus);
    }

    // Handle artist filter - set to specific value or reset to "all" if not present
    if (artistParam) {
      const matchingArtist = artists.find(
        a => a && (a.label.toLowerCase() === artistParam.toLowerCase() || a.value === artistParam)
      );
      setSelectedArtist(matchingArtist?.value || 'all');
    } else {
      // No artist parameter in URL, reset to "all"
      setSelectedArtist('all');
    }

    // Handle company filter - set to specific value or reset to "all" if not present  
    if (companyParam) {
      const matchingCompany = companies.find(
        c => c && (c.label.toLowerCase() === companyParam.toLowerCase() || c.value === companyParam)
      );
      setSelectedCompany(matchingCompany?.value || 'all');
    } else {
      // No company parameter in URL, reset to "all"
      setSelectedCompany('all');
    }

    // Handle drill shape filter - set to specific value or reset to "all" if not present
    if (drillShapeParam) {
      setSelectedDrillShape(drillShapeParam);
    } else {
      // No drill shape parameter in URL, reset to "all"
      setSelectedDrillShape('all');
    }

    // Handle year finished filter - set to specific value or reset to "all" if not present
    if (yearFinishedParam) {
      setSelectedYearFinished(yearFinishedParam);
    } else {
      // No year finished parameter in URL, reset to "all"
      setSelectedYearFinished('all');
    }

    // Handle search term - set to specific value or reset to empty if not present
    if (searchParam) {
      setSearchTerm(searchParam);
    } else {
      // No search parameter in URL, reset to empty
      setSearchTerm('');
    }

    // Handle tags - set to specific values or reset to empty array if not present
    if (tagsParam) {
      const tagIdsToSet = tagsParam
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);
      setSelectedTags(tagIdsToSet);
    } else if (tagParam && allTagsContext) {
      // Handle singular tag parameter (tag name from TagTable links)
      // tagParam is already decoded by URLSearchParams.get()
      const matchingTag = allTagsContext.find(
        tag => tag.name.toLowerCase() === tagParam.toLowerCase()
      );
      if (matchingTag) {
        setSelectedTags([matchingTag.id]);
      } else {
        // Tag not found, reset to empty
        setSelectedTags([]);
      }
    } else {
      // No tag parameters in URL, reset to empty array
      setSelectedTags([]);
    }

    // Handle include mini kits - set to specific value or reset to default (true) if not present
    if (includeMiniKitsParam) {
      setIncludeMiniKits(includeMiniKitsParam === 'true');
    } else {
      // No includeMiniKits parameter in URL, reset to default (true)
      setIncludeMiniKits(true);
    }

    if (pageParam && setCurrentPage) {
      const pageNumber = parseInt(pageParam, 10);
      if (!isNaN(pageNumber) && pageNumber > 0) setCurrentPage(pageNumber);
    }

    if (pageSizeParam && setPageSize) {
      const ps = parseInt(pageSizeParam, 10);
      if (!isNaN(ps) && ps > 0 && ps <= 100) setPageSize(ps);
    }

    if (sortFieldParam && setSortField) {
      // Validate against DashboardValidSortField values
      const validSortFields: DashboardValidSortField[] = [
        'last_updated',
        'date_purchased',
        'date_finished',
        'date_started',
        'date_received',
        'kit_name',
      ];
      if (validSortFields.includes(sortFieldParam as DashboardValidSortField)) {
        setSortField(sortFieldParam as DashboardValidSortField);
      }
    }

    if (sortDirParam && setSortDirection) {
      // Validate against SortDirectionType values
      if (sortDirParam === 'asc' || sortDirParam === 'desc') {
        setSortDirection(sortDirParam as SortDirectionType);
      }
    }

    if (locationState && Object.keys(locationState).some(key => params.has(key))) {
      setTimeout(() => {
        // Use React Router's navigate to replace the current URL with search params
        navigate(
          location.pathname + (searchParams.toString() ? '?' + searchParams.toString() : ''),
          {
            replace: true,
          }
        );
      }, 100);
    }
  }, [
    searchParams,
    location.state,
    location.pathname,
    navigate,
    isMetadataLoading,
    isLoadingProjects,
    artists,
    companies,
    allTagsContext,
    setActiveStatus,
    setSelectedArtist,
    setSelectedCompany,
    setSelectedDrillShape,
    setSelectedYearFinished,
    setSelectedTags,
    setSearchTerm,
    setIncludeMiniKits,
    setCurrentPage,
    setPageSize,
    setSortField,
    setSortDirection,
  ]);
};

export default useUrlFilterSync;
