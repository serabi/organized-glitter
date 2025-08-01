/**
 * StatusCard Component - Individual Status Metric Card
 *
 * Compact status card component that matches the current Dashboard MetricCard
 * styling exactly. Used within the StatusCarousel to display project counts
 * for each status type.
 *
 * Features:
 * - Matches existing MetricCard design (text-xs, p-4, hover:scale-1.02)
 * - Loading skeleton states for numbers and text
 * - Click handler for filtering functionality
 * - Accessibility support with proper ARIA labels
 * - Status-specific styling and visual indicators
 *
 * @author @serabi
 * @created 2025-08-01
 */

import React, { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { type ProjectFilterStatus } from '@/types/project-status';
import { createLogger } from '@/utils/logger';

const logger = createLogger('StatusCard');

export interface StatusCardProps {
  /** Card title (e.g., "Total Projects") */
  title: string;
  /** Project count number or loading state */
  count: number | 'loading' | 'error';
  /** Description text (e.g., "All active projects") */
  description?: string;
  /** Project status for filtering and styling */
  status: ProjectFilterStatus;
  /** Whether this status is currently active/selected */
  isActive?: boolean;
  /** Click handler for filtering */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Accessibility label */
  'aria-label'?: string;
}

/**
 * Individual status card component with loading states and click handling
 */
export const StatusCard: React.FC<StatusCardProps> = memo(
  ({
    title,
    count,
    description,
    status,
    isActive = false,
    onClick,
    className = '',
    'aria-label': ariaLabel,
  }) => {
    const isLoading = count === 'loading';
    const isError = count === 'error';

    // Handle card click with visual feedback
    const handleClick = () => {
      if (onClick) {
        logger.debug('Status card clicked:', { status, title });
        onClick();
      }
    };

    // Handle keyboard interaction - Enter key on keydown
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleClick();
      }
    };

    // Handle keyboard interaction - Space key on keyup (ARIA best practice)
    const handleKeyUp = (e: React.KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    };

    // Generate appropriate ARIA label
    const effectiveAriaLabel =
      ariaLabel ||
      `${title}: ${isLoading ? 'Loading' : isError ? 'Error' : count} projects${onClick ? '. Click to filter.' : ''}`;

    // Conditional props for interactive behavior
    const interactiveProps = onClick
      ? {
          onClick: handleClick,
          onKeyDown: handleKeyDown,
          onKeyUp: handleKeyUp,
          tabIndex: 0,
          role: 'button' as const,
          'aria-selected': isActive,
        }
      : {};

    return (
      <Card
        className={`transition-all duration-200 ${
          onClick ? 'cursor-pointer hover:scale-[1.02]' : ''
        } ${isActive ? 'border-primary/30 bg-muted/50' : ''} ${className}`}
        aria-label={effectiveAriaLabel}
        data-status={status}
        {...interactiveProps}
      >
        <CardContent className="p-2 md:p-4">
          <div className="space-y-1 md:space-y-2">
            {/* Title */}
            <p className="text-xs font-medium text-muted-foreground">{title}</p>

            {/* Count with loading states */}
            <div className="flex items-center space-x-2">
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span className="text-base font-bold text-muted-foreground">--</span>
                </div>
              ) : isError ? (
                <span className="text-base font-bold text-destructive" title="Failed to load count">
                  !
                </span>
              ) : (
                <span className="text-base font-bold">
                  {typeof count === 'number' ? count.toLocaleString() : count}
                </span>
              )}
            </div>

            {/* Description */}
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
        </CardContent>
      </Card>
    );
  }
);

StatusCard.displayName = 'StatusCard';

export default StatusCard;
