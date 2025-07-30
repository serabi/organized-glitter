/**
 * @fileoverview Pagination UI Components (shadcn/ui)
 *
 * A comprehensive set of pagination components built on top of shadcn/ui design system.
 * Provides accessible navigation controls with proper ARIA labels and keyboard support.
 * Components can render as either buttons or anchor links depending on usage.
 *
 * Key Features:
 * - Flexible rendering (button or anchor based on props)
 * - Full accessibility with ARIA labels and current page indicators
 * - Consistent styling with shadcn/ui button variants
 * - Responsive design with appropriate sizing
 * - Screen reader support with proper semantic markup
 *
 * Components:
 * - Pagination: Main navigation container
 * - PaginationContent: List container for pagination items
 * - PaginationItem: Individual pagination item wrapper
 * - PaginationLink: Generic clickable pagination element
 * - PaginationPrevious: Previous page navigation
 * - PaginationNext: Next page navigation
 * - PaginationEllipsis: Visual indicator for omitted pages
 *
 * Usage Examples:
 * - Button mode: Pass onClick handler for SPA navigation
 * - Link mode: Pass href for traditional page navigation
 * - Active state: Use isActive prop for current page highlighting
 *
 * @author serabi
 * @since 2025-07-03
 * @version 1.0.0 - Enhanced shadcn/ui pagination components
 */

import * as React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

import { cn } from '@/lib/utils';
import { ButtonProps } from '@/components/ui/button';
import { buttonVariants } from './variants';

const Pagination = ({ className, ...props }: React.ComponentProps<'nav'>) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn('mx-auto flex w-full justify-center', className)}
    {...props}
  />
);
Pagination.displayName = 'Pagination';

const PaginationContent = React.forwardRef<HTMLUListElement, React.ComponentProps<'ul'>>(
  ({ className, ...props }, ref) => (
    <ul ref={ref} className={cn('flex flex-row items-center gap-1', className)} {...props} />
  )
);
PaginationContent.displayName = 'PaginationContent';

const PaginationItem = React.forwardRef<HTMLLIElement, React.ComponentProps<'li'>>(
  ({ className, ...props }, ref) => <li ref={ref} className={cn('', className)} {...props} />
);
PaginationItem.displayName = 'PaginationItem';

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<ButtonProps, 'size'> &
  (React.ComponentProps<'a'> | React.ComponentProps<'button'>);

const PaginationLink = ({ className, isActive, size = 'icon', ...props }: PaginationLinkProps) => {
  const commonClassName = cn(
    buttonVariants({
      variant: isActive ? 'outline' : 'ghost',
      size,
    }),
    className
  );

  // If onClick is provided, render as button for proper click handling
  if ('onClick' in props && props.onClick) {
    const { href: _href, ...buttonProps } = props as React.ComponentProps<'button'> & {
      href?: string;
    };
    return (
      <button
        type="button"
        aria-current={isActive ? 'page' : undefined}
        className={commonClassName}
        {...buttonProps}
      />
    );
  }

  // Otherwise render as anchor for navigation
  return (
    <a
      aria-current={isActive ? 'page' : undefined}
      className={commonClassName}
      {...(props as React.ComponentProps<'a'>)}
    />
  );
};
PaginationLink.displayName = 'PaginationLink';

const PaginationPrevious = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to previous page"
    size="default"
    className={cn('gap-1 pl-2.5', className)}
    {...props}
  >
    <ChevronLeft className="h-4 w-4" />
    <span>Previous</span>
  </PaginationLink>
);
PaginationPrevious.displayName = 'PaginationPrevious';

const PaginationNext = ({ className, ...props }: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to next page"
    size="default"
    className={cn('gap-1 pr-2.5', className)}
    {...props}
  >
    <span>Next</span>
    <ChevronRight className="h-4 w-4" />
  </PaginationLink>
);
PaginationNext.displayName = 'PaginationNext';

const PaginationEllipsis = ({ className, ...props }: React.ComponentProps<'span'>) => (
  <span
    aria-hidden
    className={cn('flex h-9 w-9 items-center justify-center', className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
);
PaginationEllipsis.displayName = 'PaginationEllipsis';

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};
