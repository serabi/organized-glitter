import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ProjectType } from '@/types/project';

export interface UseAdvancedEditPaginationReturn {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  paginatedProjects: ProjectType[];
  handlePageChange: (page: number) => void;
  handlePageSizeChange: (newPageSize: number) => void;
}

/**
 * Custom hook for managing client-side pagination with URL synchronization
 *
 * @param allFilteredProjects - All projects after filtering
 * @returns Pagination state and handlers
 */
export const useAdvancedEditPagination = (
  allFilteredProjects: ProjectType[]
): UseAdvancedEditPaginationReturn => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Sync with URL parameters
  useEffect(() => {
    const pageParam = searchParams.get('page');
    const pageSizeParam = searchParams.get('pageSize');

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
  }, [searchParams]);

  // Calculate pagination metadata
  const totalItems = allFilteredProjects.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  // Reset to first page if current page is beyond available pages
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
      const newParams = new URLSearchParams(searchParams);
      newParams.set('page', '1');
      setSearchParams(newParams);
    }
  }, [totalPages, currentPage, searchParams, setSearchParams]);

  // Get paginated projects
  const paginatedProjects = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return allFilteredProjects.slice(startIndex, endIndex);
  }, [allFilteredProjects, currentPage, pageSize]);

  // Page change handler
  const handlePageChange = useCallback(
    (page: number) => {
      // Validate page number is positive and within valid range
      if (!Number.isInteger(page) || page < 1 || page > totalPages) {
        return;
      }

      setCurrentPage(page);
      const newParams = new URLSearchParams(searchParams);
      newParams.set('page', page.toString());
      setSearchParams(newParams);
    },
    [searchParams, setSearchParams, totalPages]
  );

  // Page size change handler
  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      // Validate page size is positive integer and within reasonable bounds
      if (!Number.isInteger(newPageSize) || newPageSize <= 0 || newPageSize > 100) {
        return;
      }

      setPageSize(newPageSize);
      setCurrentPage(1); // Reset to first page when changing page size
      const newParams = new URLSearchParams(searchParams);
      newParams.set('pageSize', newPageSize.toString());
      newParams.set('page', '1');
      setSearchParams(newParams);
    },
    [searchParams, setSearchParams]
  );

  return {
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    paginatedProjects,
    handlePageChange,
    handlePageSizeChange,
  };
};
