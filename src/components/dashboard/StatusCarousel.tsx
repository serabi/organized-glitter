/**
 * StatusCarousel Component - ShadCN UI Carousel for Project Status
 *
 * Professional carousel component using ShadCN UI Carousel that displays all 9 project
 * statuses in a responsive, mobile-friendly format. Replaces custom carousel implementation
 * with industry-standard component that properly handles arrow positioning.
 *
 * Features:
 * - Responsive: 1 card (mobile) → 2 cards (tablet) → 3 cards (desktop) → 4 cards (large)
 * - Touch/swipe support via Embla Carousel
 * - Proper arrow positioning (no overlap issues)
 * - Keyboard navigation built-in
 * - Status filtering integration via FilterProvider
 * - Accessibility support with ARIA labels
 *
 * Status Order: Total → Purchased → Stash → Progress → Hold → Wishlist → Completed → Archived → Destashed
 *
 * @author @serabi
 * @created 2025-08-01
 */

import React, { memo } from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { useStatsOptimized, type AllStatusCountsType } from '@/contexts/StatsContextOptimized';
import { useStatusFilter } from '@/contexts/FilterProvider';
import { type ProjectFilterStatus } from '@/types/project-status';
import StatusCard from './StatusCard';
import { createLogger } from '@/utils/logger';

const logger = createLogger('StatusCarousel');
const STATUS_CARDS = [
  {
    status: 'everything' as ProjectFilterStatus,
    title: 'All Projects',
    description: 'Your complete collection',
    getCount: (counts: AllStatusCountsType) => counts.everything,
  },
  {
    status: 'active' as ProjectFilterStatus,
    title: 'Collection Total',
    description: 'Purchased, In Stash, In Progress, On Hold',
    getCount: (counts: AllStatusCountsType) => counts.active,
  },
  {
    status: 'purchased' as ProjectFilterStatus,
    title: 'Purchased',
    description: 'Bought but not arrived',
    getCount: (counts: AllStatusCountsType) => counts.purchased,
  },
  {
    status: 'stash' as ProjectFilterStatus,
    title: 'In Stash',
    description: 'Ready to start',
    getCount: (counts: AllStatusCountsType) => counts.stash,
  },
  {
    status: 'progress' as ProjectFilterStatus,
    title: 'In Progress',
    description: 'Currently working on',
    getCount: (counts: AllStatusCountsType) => counts.progress,
  },
  {
    status: 'onhold' as ProjectFilterStatus,
    title: 'On Hold',
    description: 'Temporarily paused',
    getCount: (counts: AllStatusCountsType) => counts.onhold,
  },
  {
    status: 'wishlist' as ProjectFilterStatus,
    title: 'Wishlist',
    description: 'Future projects & ideas',
    getCount: (counts: AllStatusCountsType) => counts.wishlist,
  },
  {
    status: 'completed' as ProjectFilterStatus,
    title: 'Completed',
    description: 'Finished masterpieces',
    getCount: (counts: AllStatusCountsType) => counts.completed,
  },
  {
    status: 'archived' as ProjectFilterStatus,
    title: 'Archived',
    description: 'Historical projects',
    getCount: (counts: AllStatusCountsType) => counts.archived,
  },
  {
    status: 'destashed' as ProjectFilterStatus,
    title: 'Destashed',
    description: 'Removed from collection',
    getCount: (counts: AllStatusCountsType) => counts.destashed,
  },
] as const;

export interface StatusCarouselProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * Professional status carousel using ShadCN UI components
 */
export const StatusCarousel: React.FC<StatusCarouselProps> = memo(({ className = '' }) => {
  // Data from contexts
  const { getAllStatusCounts } = useStatsOptimized();
  const { activeStatus, updateStatus } = useStatusFilter();

  const counts = getAllStatusCounts();

  // Handle status filtering
  const handleStatusFilter = (status: ProjectFilterStatus) => {
    logger.debug('Status carousel filtering by:', status);
    updateStatus(status);
  };

  return (
    <div className={`w-full ${className}`}>
      <Carousel
        opts={{
          align: 'start',
          loop: false,
        }}
        className="w-full"
      >
        <CarouselContent className="ml-12 md:ml-12">
          {STATUS_CARDS.map(cardConfig => {
            const isActive = activeStatus === cardConfig.status;

            // Get count for this status
            let count: number | 'loading' | 'error';
            if (counts === 'loading') {
              count = 'loading';
            } else if (counts === 'error') {
              count = 'error';
            } else {
              count = cardConfig.getCount(counts);
            }

            return (
              <CarouselItem
                key={cardConfig.status}
                className="basis-full pl-1 md:basis-1/2 md:pl-4 lg:basis-1/3 xl:basis-1/4"
              >
                <div className="px-1 md:px-0">
                  <StatusCard
                    title={cardConfig.title}
                    count={count}
                    description={cardConfig.description}
                    status={cardConfig.status}
                    isActive={isActive}
                    onClick={() => handleStatusFilter(cardConfig.status)}
                    className="h-20 text-sm md:h-auto md:text-base"
                    aria-label={`${cardConfig.title}: ${
                      count === 'loading' ? 'Loading' : count === 'error' ? 'Error' : count
                    } projects. Click to filter by this status.`}
                  />
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious className="left-4 h-8 min-h-8 w-8 min-w-8 md:left-4 md:h-10 md:min-h-10 md:w-10 md:min-w-10" />
        <CarouselNext className="right-4 h-8 min-h-8 w-8 min-w-8 md:right-4 md:h-10 md:min-h-10 md:w-10 md:min-w-10" />
      </Carousel>
    </div>
  );
});

StatusCarousel.displayName = 'StatusCarousel';

export default StatusCarousel;
