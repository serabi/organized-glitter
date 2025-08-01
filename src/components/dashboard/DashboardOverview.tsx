/**
 * Dashboard Overview Component - Key Metrics Display
 *
 * Displays prominent metric cards showing key project statistics at the top of the dashboard.
 * Replaces the tab-based filtering approach with a cleaner overview design while maintaining
 * the same functionality and data sources.
 *
 * Key Features:
 * - Responsive grid layout (2x2 on mobile, horizontal on desktop)
 * - Color-coded status indicators matching existing design system
 * - Loading states with spinner integration from StatsContext
 * - Clickable cards for filtering (when enabled)
 * - Glassmorphism design consistent with existing components
 *
 * Data Flow:
 * - Uses focused StatsContext for consistent loading states and counts
 * - Integrates with FilterProvider for potential filtering functionality
 * - Maintains existing mobile-optimized loading patterns
 *
 * @author @serabi
 * @created 2025-08-01
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useStats } from '@/contexts/StatsContext';
import { useStatusFilter } from '@/contexts/FilterProvider';
import { ProjectFilterStatus } from '@/types/project';
import { createLogger } from '@/utils/logger';

const logger = createLogger('DashboardOverview');

interface MetricCardProps {
  title: string;
  count: number | 'loading' | 'error';
  variant:
    | 'default'
    | 'secondary'
    | 'outline'
    | 'status-progress'
    | 'status-completed'
    | 'status-stash';
  description?: string;
  onClick?: () => void;
  className?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  count,
  variant,
  description,
  onClick,
  className = '',
}) => {
  const isLoading = count === 'loading';
  const isError = count === 'error';

  return (
    <Card
      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${onClick ? 'hover:scale-[1.02]' : ''} ${className} `}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-center space-x-2">
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span className="text-lg font-bold text-muted-foreground">--</span>
                </div>
              ) : isError ? (
                <span className="text-lg font-bold text-destructive">!</span>
              ) : (
                <span className="text-lg font-bold">{count}</span>
              )}
            </div>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          <div className="flex-shrink-0">
            <Badge variant={variant} className="text-xs">
              {title}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const DashboardOverview: React.FC = () => {
  const { getCountsForTabs } = useStats();
  const { activeStatus, updateStatus } = useStatusFilter();

  const counts = getCountsForTabs();

  React.useEffect(() => {
    logger.debug('Dashboard overview counts updated:', counts);
  }, [counts]);

  const handleStatusFilter = (status: ProjectFilterStatus) => {
    logger.debug('Overview card clicked, filtering by status:', status);
    updateStatus(status);
  };

  const metricCards = [
    {
      title: 'Total Projects',
      count: counts.all,
      variant: 'default' as const,
      description: 'All projects in your collection',
      filterStatus: 'all' as ProjectFilterStatus,
    },
    {
      title: 'In Progress',
      count: counts.progress,
      variant: 'status-progress' as const,
      description: 'Currently working on',
      filterStatus: 'progress' as ProjectFilterStatus,
    },
    {
      title: 'Completed',
      count: counts.completed,
      variant: 'status-completed' as const,
      description: 'Finished projects',
      filterStatus: 'completed' as ProjectFilterStatus,
    },
    {
      title: 'In Stash',
      count: counts.stash,
      variant: 'status-stash' as const,
      description: 'Ready to start',
      filterStatus: 'stash' as ProjectFilterStatus,
    },
  ];

  return (
    <div className="mb-8">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        {metricCards.map(card => {
          const isActive = activeStatus === card.filterStatus;
          return (
            <MetricCard
              key={card.title}
              title={card.title}
              count={card.count}
              variant={card.variant}
              description={card.description}
              onClick={() => handleStatusFilter(card.filterStatus)}
              className={isActive ? 'bg-primary/5 ring-2 ring-primary' : ''}
            />
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(DashboardOverview);
