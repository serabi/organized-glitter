/**
 * @fileoverview Spin History Display Component
 *
 * Displays a chronological list of randomizer wheel spin results with pagination,
 * navigation to selected projects, and history management features. Includes
 * responsive design and comprehensive error handling.
 *
 * @author serabi
 * @version 1.0.0
 * @since 2025-06-28
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, History, Trash2, ChevronDown } from 'lucide-react';
import { useSpinHistory } from '@/hooks/queries/useSpinHistory';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('SpinHistory');

/**
 * Props interface for the SpinHistory component
 * @interface SpinHistoryProps
 */
interface SpinHistoryProps {
  /** User ID to fetch spin history for */
  userId: string | undefined;
  /** Optional callback function to clear all history */
  onClearHistory?: () => void;
}

/**
 * Displays chronological spin history with pagination and management features
 *
 * Shows a scrollable list of past randomizer wheel spins with relative timestamps,
 * project navigation links, and optional history clearing. Uses dynamic pagination
 * to show 8 recent spins by default with option to load up to 50 total spins.
 *
 * @param {SpinHistoryProps} props - Component props
 * @param {string|undefined} props.userId - User ID to fetch history for
 * @param {function} [props.onClearHistory] - Optional callback to clear all history
 *
 * @returns {JSX.Element} The rendered spin history component
 *
 * @example
 * ```tsx
 * const handleClearHistory = async () => {
 *   if (confirm('Clear all spin history?')) {
 *     await clearSpinHistory(user.id);
 *     toast({ title: 'History cleared' });
 *   }
 * };
 *
 * <SpinHistory
 *   userId={user?.id}
 *   onClearHistory={handleClearHistory}
 * />
 * ```
 *
 * @features
 * - Chronological display with newest spins first
 * - Relative timestamps (e.g., "2h ago", "3d ago")
 * - Project navigation links with external link icons
 * - Pagination: 8 recent → expand to 50 total
 * - Loading skeletons during data fetch
 * - Empty state with helpful messaging
 * - History clearing with confirmation
 * - Responsive scrollable design
 * - Latest spin badge highlighting
 *
 * @performance
 * - Single React Query hook with dynamic limit
 * - Efficient re-rendering with optimized state management
 * - Minimal network requests through pagination strategy
 */
export const SpinHistory: React.FC<SpinHistoryProps> = ({ userId, onClearHistory }) => {
  /** Whether to show all history (50 items) or just recent (8 items) */
  const [showAll, setShowAll] = useState(false);

  /** Dynamic limit based on pagination state - 8 recent or 50 total */
  const dynamicLimit = showAll ? 50 : 8;

  /** Spin history data with loading state from React Query */
  const { data: history = [], isLoading } = useSpinHistory({
    userId,
    limit: dynamicLimit,
    enabled: true,
  });

  /** Whether there are more history items to show beyond the current 8 */
  const hasMoreHistory = !showAll && history.length >= 8;

  // Debug logging - summary information only (no sensitive data)
  React.useEffect(() => {
    if (history.length > 0) {
      logger.debug('Spin history data summary', {
        showAll,
        dynamicLimit,
        historyLength: history.length,
        hasRecords: history.length > 0,
      });
    }
  }, [history, showAll, dynamicLimit]);

  /**
   * Handles the "Show More" button click to expand history to 50 items
   * Updates the showAll state which triggers a new query with higher limit
   */
  const handleShowMore = () => {
    logger.debug('Show more history clicked');
    setShowAll(true);
    // Data should already be prefetched, so this will be instant
  };

  /**
   * Formats a date string into a human-readable relative time
   *
   * @param {string} dateString - ISO date string to format
   * @returns {string} Formatted relative time (e.g., "2h ago", "3d ago")
   */
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);

      // Check if the date is invalid
      if (isNaN(date.getTime())) {
        logger.error('Invalid date string', { dateString });
        return 'Unknown';
      }

      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 1) {
        const diffInMinutes = Math.floor(diffInHours * 60);
        return diffInMinutes <= 1 ? 'Just now' : `${diffInMinutes}m ago`;
      } else if (diffInHours < 24) {
        return `${Math.floor(diffInHours)}h ago`;
      } else if (diffInHours < 168) {
        // 7 days
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays}d ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      logger.error('Error formatting date', { dateString, error });
      return 'Unknown';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <History className="h-5 w-5" />
            Spin History
          </h3>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2 rounded-lg border p-3" data-testid="spin-skeleton">
              <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <History className="h-5 w-5" />
          Spin History
        </h3>
        {history.length > 0 && onClearHistory && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              logger.debug('Clear history button clicked');
              onClearHistory();
            }}
            className="text-destructive hover:text-destructive"
            aria-label="Clear spin history"
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* History list */}
      {history.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          <History className="mx-auto mb-3 h-12 w-12 opacity-50" />
          <p className="mb-1 text-base">No spins yet</p>
          <p className="text-sm">Your spin history will appear here</p>
        </div>
      ) : (
        <ScrollArea className="h-80">
          <div className="space-y-2 pr-4">
            {history.map((spin, index) => (
              <div
                key={spin.id}
                className="rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <p className="truncate font-medium">{spin.project_title}</p>
                      {index === 0 && (
                        <Badge variant="secondary" className="text-xs">
                          Latest
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{formatDate(spin.spun_at)}</span>
                      <span>•</span>
                      <span>{(spin.selected_projects as string[])?.length ?? 0} options</span>
                    </div>
                  </div>

                  {/* Link to project (if it still exists) */}
                  <div className="flex-shrink-0">
                    <Button variant="ghost" size="sm" asChild className="h-auto p-1">
                      <Link
                        to={`/projects/${spin.project}`}
                        onClick={() => {
                          logger.debug('Project link clicked from history', {
                            projectId: spin.project,
                            projectTitle: spin.project_title,
                          });
                        }}
                        aria-label={`Go to project: ${spin.project_title}`}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Show More Button */}
      {hasMoreHistory && (
        <div className="border-t pt-3 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShowMore}
            disabled={isLoading}
            className="text-sm"
          >
            <ChevronDown className="mr-1 h-4 w-4" />
            {isLoading ? 'Loading...' : 'Show More History'}
          </Button>
        </div>
      )}

      {/* Footer note */}
      {history.length > 0 && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          {showAll
            ? `Showing all ${history.length} spins`
            : `Showing last ${Math.min(history.length, 8)} spins`}
        </p>
      )}
    </div>
  );
};
