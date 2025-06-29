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

interface ProjectPaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  className?: string;
}

const ProjectPagination: React.FC<ProjectPaginationProps> = React.memo(
  ({
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    onPageChange,
    onPageSizeChange,
    className,
  }) => {
    const isMobile = useIsMobile();

    // Memoize calculations to prevent unnecessary re-computations
    const { startItem, endItem } = useMemo(
      () => ({
        startItem: (currentPage - 1) * pageSize + 1,
        endItem: Math.min(currentPage * pageSize, totalItems),
      }),
      [currentPage, pageSize, totalItems]
    );

    const renderPageNumbers = useMemo(() => {
      const pages = [];
      // Reduce visible pages on mobile for better fit
      const maxVisiblePages = isMobile ? 3 : 5;

      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

      // Adjust startPage if we're near the end
      if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }

      // First page and ellipsis
      if (startPage > 1) {
        pages.push(
          <PaginationItem key={1}>
            <PaginationLink onClick={() => onPageChange(1)} isActive={currentPage === 1}>
              1
            </PaginationLink>
          </PaginationItem>
        );
        if (startPage > 2) {
          pages.push(
            <PaginationItem key="ellipsis-start">
              <PaginationEllipsis />
            </PaginationItem>
          );
        }
      }

      // Visible page numbers
      for (let i = startPage; i <= endPage; i++) {
        pages.push(
          <PaginationItem key={i}>
            <PaginationLink onClick={() => onPageChange(i)} isActive={currentPage === i}>
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }

      // Last page and ellipsis
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          pages.push(
            <PaginationItem key="ellipsis-end">
              <PaginationEllipsis />
            </PaginationItem>
          );
        }
        pages.push(
          <PaginationItem key={totalPages}>
            <PaginationLink
              onClick={() => onPageChange(totalPages)}
              isActive={currentPage === totalPages}
            >
              {totalPages}
            </PaginationLink>
          </PaginationItem>
        );
      }

      return pages;
    }, [currentPage, totalPages, isMobile, onPageChange]);

    if (totalPages <= 1) {
      return (
        <div className={`flex items-center justify-center ${className}`}>
          <div className="text-sm text-muted-foreground">
            Showing {totalItems} {totalItems === 1 ? 'project' : 'projects'}
          </div>
        </div>
      );
    }

    return (
      <div
        className={`flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 ${className}`}
      >
        {/* Status text - full width on mobile, left side on desktop */}
        <div className="text-center text-sm text-muted-foreground sm:text-left">
          Showing {startItem}-{endItem} of {totalItems} projects
        </div>

        {/* Controls container - stacked on mobile, row on desktop */}
        <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
          {/* Page size selector */}
          <div className="flex items-center justify-center space-x-2 sm:justify-start">
            <span className="whitespace-nowrap text-sm text-muted-foreground">Items per page:</span>
            <Select
              value={pageSize.toString()}
              onValueChange={value => onPageSizeChange(parseInt(value))}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Pagination controls */}
          <div className="flex justify-center sm:justify-end">
            <Pagination>
              <PaginationContent className="flex-wrap justify-center gap-1">
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    className={
                      currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                    }
                    aria-disabled={currentPage === 1}
                    tabIndex={currentPage === 1 ? -1 : undefined}
                  />
                </PaginationItem>

                {renderPageNumbers}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    className={
                      currentPage === totalPages
                        ? 'pointer-events-none opacity-50'
                        : 'cursor-pointer'
                    }
                    aria-disabled={currentPage === totalPages}
                    tabIndex={currentPage === totalPages ? -1 : undefined}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      </div>
    );
  }
);

ProjectPagination.displayName = 'ProjectPagination';

export default ProjectPagination;
