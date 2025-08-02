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

import React, { memo, useState, useEffect } from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/pagination';
import { useStatsOptimized } from '@/contexts/useStatsOptimized';
import { type AllStatusCountsType } from '@/contexts/contexts-stats';
import { useStatusFilter } from '@/contexts/FilterHooks';
import { type ProjectFilterStatus } from '@/types/project-status';
import StatusCard from './StatusCard';
import { createLogger } from '@/utils/logger';
import { useIsTouchDevice } from '@/hooks/use-mobile';

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
  // Carousel API state tracking
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  // Data from contexts
  const { getAllStatusCounts } = useStatsOptimized();
  const { activeStatus, updateStatus } = useStatusFilter();
  const isTouchDevice = useIsTouchDevice();

  const counts = getAllStatusCounts();

  // Track carousel API state changes
  useEffect(() => {
    if (!api) {
      return;
    }

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  // Handle status filtering
  const handleStatusFilter = (status: ProjectFilterStatus) => {
    logger.debug('Status carousel filtering by:', status);
    updateStatus(status);
  };

  return (
    <div className={`w-full ${className}`}>
      <Carousel
        setApi={setApi}
        opts={{
          align: 'start',
          loop: false,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-4">
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
                className="basis-full pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4"
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
        {!isTouchDevice && (
          <>
            <CarouselPrevious className="h-8 min-h-8 w-8 min-w-8 md:h-10 md:min-h-10 md:w-10 md:min-w-10" />
            <CarouselNext className="h-8 min-h-8 w-8 min-w-8 md:h-10 md:min-h-10 md:w-10 md:min-w-10" />
          </>
        )}
      </Carousel>

      {/* Mobile pagination indicators - only show on touch devices */}
      {isTouchDevice && count > 1 && (
        <Pagination className="mt-4 md:hidden">
          <PaginationContent>
            {Array.from({ length: count }).map((_, index) => (
              <PaginationItem key={index}>
                <PaginationLink
                  onClick={() => api?.scrollTo(index)}
                  isActive={index + 1 === current}
                  size="sm"
                  aria-label={`Go to slide ${index + 1}`}
                >
                  •
                </PaginationLink>
              </PaginationItem>
            ))}
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
});

StatusCarousel.displayName = 'StatusCarousel';

export default StatusCarousel;
