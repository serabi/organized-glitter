/**
 * @fileoverview Project Status Filter Tabs Component
 *
 * This component provides a tabbed interface for filtering projects by their status.
 * It displays dynamic counts for each status category and handles status filter changes.
 * The tabs are responsive and adapt to different screen sizes.
 *
 * Key Features:
 * - Dynamic status counts from dashboard statistics with spinner loading
 * - Color-coded badges for visual status differentiation
 * - Enhanced tab design with borders, backgrounds, and elevation
 * - Active state styling with subtle shadows and borders
 * - Mobile-responsive vertical stacking layout for better UX
 * - Smart text abbreviation on small screens (< 375px)
 * - Responsive grid layout (vertical mobile, 4 cols tablet, 8 desktop)
 * - Smooth hover animations and scale transitions
 * - Enhanced touch targets (min 44px) for mobile accessibility
 * - Backdrop blur and glassmorphism effects
 * - Real-time count updates when projects change
 * - Spinner-based loading states for improved mobile experience
 * - Mobile network timeout handling and adaptive loading
 * - Keyboard accessible tab navigation
 *
 * Performance Optimizations:
 * - Uses focused StatsContext instead of monolithic context
 * - Implements spinner loading instead of showing "0" on mobile
 * - Mobile-optimized network handling with timeouts
 * - Reduced re-renders through context splitting
 *
 * Status Categories:
 * - All: Shows total project count
 * - Wishlist: Projects user wants to purchase
 * - Purchased: Projects bought but not started
 * - In Stash: Projects ready to work on
 * - In Progress: Currently active projects
 * - Completed: Finished projects
 * - Destashed: Projects removed from collection
 * - Archived: Projects no longer actively managed
 *
 * @author serabi
 * @since 2025-07-03
 * @version 2.0.0 - Migrated to focused contexts with spinner loading
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import ResponsiveTabText from '@/components/ui/responsive-tab-text';
import { useWindowDimensions } from '@/hooks/use-mobile';
import { ProjectFilterStatus } from '@/types/project';
import { useStats, CountsForTabsType } from '@/contexts/StatsContext';
import { useStatusFilter } from '@/contexts/FilterProvider';
import { createLogger } from '@/utils/secureLogger';

// Tab configuration for dynamic rendering
interface TabConfig {
  value: ProjectFilterStatus;
  fullText: string;
  abbreviatedText: string;
  getCount: (counts: CountsForTabsType) => number;
}

const TAB_CONFIG: TabConfig[] = [
  {
    value: 'all',
    fullText: 'All',
    abbreviatedText: 'All',
    getCount: counts => counts.all,
  },
  {
    value: 'wishlist',
    fullText: 'Wishlist',
    abbreviatedText: 'Wish',
    getCount: counts => counts.wishlist,
  },
  {
    value: 'purchased',
    fullText: 'Purchased',
    abbreviatedText: 'Bought',
    getCount: counts => counts.purchased,
  },
  {
    value: 'stash',
    fullText: 'In Stash',
    abbreviatedText: 'Stash',
    getCount: counts => counts.stash,
  },
  {
    value: 'progress',
    fullText: 'In Progress',
    abbreviatedText: 'Progress',
    getCount: counts => counts.progress,
  },
  {
    value: 'completed',
    fullText: 'Completed',
    abbreviatedText: 'Done',
    getCount: counts => counts.completed,
  },
  {
    value: 'destashed',
    fullText: 'Destashed',
    abbreviatedText: 'Removed',
    getCount: counts => counts.destashed,
  },
  {
    value: 'archived',
    fullText: 'Archived',
    abbreviatedText: 'Archive',
    getCount: counts => counts.archived,
  },
];

const logger = createLogger('StatusTabs');

// Valid ProjectFilterStatus values for type validation
const VALID_FILTER_STATUSES: readonly ProjectFilterStatus[] = [
  'all',
  'wishlist',
  'purchased',
  'stash',
  'progress',
  'completed',
  'destashed',
  'archived',
] as const;

// Type guard to validate ProjectFilterStatus
const isValidProjectFilterStatus = (value: string): value is ProjectFilterStatus => {
  return VALID_FILTER_STATUSES.includes(value as ProjectFilterStatus);
};

const StatusTabsComponent = () => {
  // Use focused contexts instead of monolithic DashboardFiltersContext
  const { getCountsForTabs, getBadgeContent } = useStats();
  const { activeStatus, updateStatus } = useStatusFilter();

  // Fallback counts object with all required properties
  const fallbackCounts: CountsForTabsType = {
    all: 0,
    wishlist: 0,
    purchased: 0,
    stash: 0,
    progress: 0,
    completed: 0,
    destashed: 0,
    archived: 0,
  };

  // Get counts with error handling and loading state consideration
  const counts = (() => {
    try {
      const result = getCountsForTabs();

      // If result is a loading state string, return fallback counts
      if (typeof result === 'string') {
        logger.debug('Stats are in loading state:', result);
        return fallbackCounts;
      }

      // Return actual counts
      return result;
    } catch (error) {
      logger.error('Error getting counts for tabs:', error);
      return fallbackCounts;
    }
  })();

  const { width } = useWindowDimensions();

  // Responsive layout logic
  const isMobile = width < 768;

  // Map status to badge variant for color coding
  const getBadgeVariant = (status: string): BadgeProps['variant'] => {
    const variants: Record<string, BadgeProps['variant']> = {
      all: 'status-all',
      wishlist: 'status-wishlist',
      purchased: 'status-purchased',
      stash: 'status-stash',
      progress: 'status-progress',
      completed: 'status-completed',
      destashed: 'status-destashed',
      archived: 'status-archived',
    };
    return variants[status] || 'status-all';
  };

  // Generate className for TabsTrigger components
  const getTriggerClassName = (isMobile: boolean): string => {
    const baseClasses =
      'relative flex items-center gap-2 rounded-md border border-transparent bg-background/20 backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md data-[state=active]:border-primary/20 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md';
    const responsiveClasses = isMobile
      ? 'min-h-[44px] w-full justify-start px-3 py-2'
      : 'px-3 py-2';
    return `${baseClasses} ${responsiveClasses}`;
  };

  return (
    <Tabs
      value={activeStatus}
      defaultValue={activeStatus}
      className="w-full"
      onValueChange={value => {
        if (isValidProjectFilterStatus(value)) {
          updateStatus(value);
        } else {
          logger.error('Invalid filter status value received:', {
            value,
            validValues: VALID_FILTER_STATUSES,
          });
        }
      }}
    >
      <TabsList
        className={`h-auto w-full rounded-lg border border-border/50 bg-card/50 p-2 shadow-sm backdrop-blur-sm ${
          isMobile ? 'flex flex-col gap-1.5' : 'grid grid-cols-4 gap-1.5 lg:grid-cols-8'
        }`}
      >
        {TAB_CONFIG.map(tab => (
          <TabsTrigger key={tab.value} value={tab.value} className={getTriggerClassName(isMobile)}>
            <ResponsiveTabText
              fullText={tab.fullText}
              abbreviatedText={tab.abbreviatedText}
              breakpoint={375}
            />
            <Badge variant={getBadgeVariant(tab.value)} className="text-[11px]">
              {getBadgeContent(tab.getCount(counts))}
            </Badge>
          </TabsTrigger>
        ))}
      </TabsList>

      {/* TabsContent is needed for the Tabs component to work properly */}
      {TAB_CONFIG.map(tab => (
        <TabsContent key={tab.value} value={tab.value} className="mt-0"></TabsContent>
      ))}
    </Tabs>
  );
};

export default StatusTabsComponent;
