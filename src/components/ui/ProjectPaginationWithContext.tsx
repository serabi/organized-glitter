/**
 * Context-aware project pagination component
 * @author @serabi
 * @created 2025-07-09
 */

import React, { useMemo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePagination } from '@/contexts/FilterProvider';

interface ProjectPaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  className?: string;
  disabled?: boolean;
}

// Generic ProjectPagination (keeps existing interface for backward compatibility)
const ProjectPagination: React.FC<ProjectPaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  className = '',
  disabled = false,
}) => {
  const isMobile = useIsMobile();

  // Generate page numbers to display
  const pageNumbers = useMemo(() => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisiblePages = isMobile ? 3 : 5;
    const halfVisible = Math.floor(maxVisiblePages / 2);

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      // Calculate start and end of middle section
      let start = Math.max(2, currentPage - halfVisible);
      let end = Math.min(totalPages - 1, currentPage + halfVisible);

      // Adjust if we're near the beginning or end
      if (currentPage <= halfVisible + 1) {
        end = maxVisiblePages - 1;
      } else if (currentPage >= totalPages - halfVisible) {
        start = totalPages - maxVisiblePages + 2;
      }

      // Add ellipsis after first page if needed
      if (start > 2) {
        pages.push('ellipsis');
      }

      // Add middle pages
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      // Add ellipsis before last page if needed
      if (end < totalPages - 1) {
        pages.push('ellipsis');
      }

      // Always show last page (if not already included)
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  }, [currentPage, totalPages, isMobile]);

  const showingStart = (currentPage - 1) * pageSize + 1;
  const showingEnd = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Results summary */}
      <div className="text-sm text-muted-foreground">
        {totalItems > 0 ? (
          <>
            Showing <span className="font-medium">{showingStart}</span> to{' '}
            <span className="font-medium">{showingEnd}</span> of{' '}
            <span className="font-medium">{totalItems}</span> projects
          </>
        ) : (
          'No projects found'
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Page size selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Show:</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => onPageSizeChange(Number(value))}
              disabled={disabled}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">per page</span>
          </div>

          {/* Pagination controls */}
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => onPageChange(currentPage - 1)}
                  className={
                    currentPage <= 1 || disabled
                      ? 'pointer-events-none opacity-50'
                      : 'cursor-pointer'
                  }
                />
              </PaginationItem>

              {pageNumbers.map((page, index) => (
                <PaginationItem key={index}>
                  {page === 'ellipsis' ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      onClick={() => onPageChange(page)}
                      isActive={page === currentPage}
                      className={
                        disabled ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                      }
                    >
                      {page}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  onClick={() => onPageChange(currentPage + 1)}
                  className={
                    currentPage >= totalPages || disabled
                      ? 'pointer-events-none opacity-50'
                      : 'cursor-pointer'
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
};

// Context-aware ProjectPagination
export const ProjectPaginationWithContext: React.FC<{
  totalPages: number;
  totalItems: number;
  className?: string;
  disabled?: boolean;
}> = ({ totalPages, totalItems, className, disabled }) => {
  const { currentPage, pageSize, updatePage, updatePageSize } = usePagination();
  
  return (
    <ProjectPagination
      currentPage={currentPage}
      totalPages={totalPages}
      pageSize={pageSize}
      totalItems={totalItems}
      onPageChange={updatePage}
      onPageSizeChange={updatePageSize}
      className={className}
      disabled={disabled}
    />
  );
};

ProjectPaginationWithContext.displayName = 'ProjectPaginationWithContext';

export default ProjectPagination;