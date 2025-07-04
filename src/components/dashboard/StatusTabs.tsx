/**
 * @fileoverview Project Status Filter Tabs Component
 *
 * This component provides a tabbed interface for filtering projects by their status.
 * It displays dynamic counts for each status category and handles status filter changes.
 * The tabs are responsive and adapt to different screen sizes.
 *
 * Key Features:
 * - Dynamic status counts from dashboard statistics
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
 * - Integrated with DashboardFiltersContext for state management
 * - Keyboard accessible tab navigation
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
 * @version 1.4.0 - Vertical stacking layout for mobile with enhanced tab design
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import ResponsiveTabText, {
  getStatusText,
  useWindowDimensions,
} from '@/components/ui/responsive-tab-text';
import { ProjectFilterStatus } from '@/types/project';
import { useDashboardFilters } from '@/contexts/DashboardFiltersContext';

const StatusTabsComponent = () => {
  // Removed unused props
  const { getCountsForTabs, filters, updateStatus } = useDashboardFilters();
  const activeStatus = filters.activeStatus;
  const counts = getCountsForTabs();
  const { width } = useWindowDimensions();

  // Responsive layout logic
  const isMobile = width < 768;
  const isSmallMobile = width < 375;

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

  return (
    <Tabs
      value={activeStatus}
      defaultValue={activeStatus}
      className="w-full"
      onValueChange={value => updateStatus(value as ProjectFilterStatus)}
    >
      <TabsList
        className={`h-auto w-full rounded-lg border border-border/50 bg-card/50 p-2 shadow-sm backdrop-blur-sm ${
          isMobile ? 'flex flex-col gap-1.5' : 'grid grid-cols-4 gap-1.5 lg:grid-cols-8'
        }`}
      >
        <TabsTrigger
          value="all"
          className={`relative flex items-center gap-2 rounded-md border border-transparent bg-background/20 backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md data-[state=active]:border-primary/20 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md ${
            isMobile ? 'min-h-[44px] w-full justify-start px-3 py-2' : 'px-3 py-2'
          }`}
        >
          <ResponsiveTabText fullText="All" abbreviatedText="All" breakpoint={375} />
          <Badge variant={getBadgeVariant('all')} className="text-xs">
            {counts.all}
          </Badge>
        </TabsTrigger>
        <TabsTrigger
          value="wishlist"
          className={`relative flex items-center gap-2 rounded-md border border-transparent bg-background/20 backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md data-[state=active]:border-primary/20 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md ${
            isMobile ? 'min-h-[44px] w-full justify-start px-3 py-2' : 'px-3 py-2'
          }`}
        >
          <ResponsiveTabText fullText="Wishlist" abbreviatedText="Wish" breakpoint={375} />
          <Badge variant={getBadgeVariant('wishlist')} className="text-xs">
            {counts.wishlist}
          </Badge>
        </TabsTrigger>
        <TabsTrigger
          value="purchased"
          className={`relative flex items-center gap-2 rounded-md border border-transparent bg-background/20 backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md data-[state=active]:border-primary/20 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md ${
            isMobile ? 'min-h-[44px] w-full justify-start px-3 py-2' : 'px-3 py-2'
          }`}
        >
          <ResponsiveTabText fullText="Purchased" abbreviatedText="Bought" breakpoint={375} />
          <Badge variant={getBadgeVariant('purchased')} className="text-xs">
            {counts.purchased}
          </Badge>
        </TabsTrigger>
        <TabsTrigger
          value="stash"
          className={`relative flex items-center gap-2 rounded-md border border-transparent bg-background/20 backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md data-[state=active]:border-primary/20 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md ${
            isMobile ? 'min-h-[44px] w-full justify-start px-3 py-2' : 'px-3 py-2'
          }`}
        >
          <ResponsiveTabText fullText="In Stash" abbreviatedText="Stash" breakpoint={375} />
          <Badge variant={getBadgeVariant('stash')} className="text-xs">
            {counts.stash}
          </Badge>
        </TabsTrigger>
        <TabsTrigger
          value="progress"
          className={`relative flex items-center gap-2 rounded-md border border-transparent bg-background/20 backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md data-[state=active]:border-primary/20 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md ${
            isMobile ? 'min-h-[44px] w-full justify-start px-3 py-2' : 'px-3 py-2'
          }`}
        >
          <ResponsiveTabText fullText="In Progress" abbreviatedText="Progress" breakpoint={375} />
          <Badge variant={getBadgeVariant('progress')} className="text-xs">
            {counts.progress}
          </Badge>
        </TabsTrigger>
        <TabsTrigger
          value="completed"
          className={`relative flex items-center gap-2 rounded-md border border-transparent bg-background/20 backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md data-[state=active]:border-primary/20 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md ${
            isMobile ? 'min-h-[44px] w-full justify-start px-3 py-2' : 'px-3 py-2'
          }`}
        >
          <ResponsiveTabText fullText="Completed" abbreviatedText="Done" breakpoint={375} />
          <Badge variant={getBadgeVariant('completed')} className="text-xs">
            {counts.completed}
          </Badge>
        </TabsTrigger>
        <TabsTrigger
          value="destashed"
          className={`relative flex items-center gap-2 rounded-md border border-transparent bg-background/20 backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md data-[state=active]:border-primary/20 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md ${
            isMobile ? 'min-h-[44px] w-full justify-start px-3 py-2' : 'px-3 py-2'
          }`}
        >
          <ResponsiveTabText fullText="Destashed" abbreviatedText="Removed" breakpoint={375} />
          <Badge variant={getBadgeVariant('destashed')} className="text-xs">
            {counts.destashed}
          </Badge>
        </TabsTrigger>
        <TabsTrigger
          value="archived"
          className={`relative flex items-center gap-2 rounded-md border border-transparent bg-background/20 backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md data-[state=active]:border-primary/20 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md ${
            isMobile ? 'min-h-[44px] w-full justify-start px-3 py-2' : 'px-3 py-2'
          }`}
        >
          <ResponsiveTabText fullText="Archived" abbreviatedText="Archive" breakpoint={375} />
          <Badge variant={getBadgeVariant('archived')} className="text-xs">
            {counts.archived}
          </Badge>
        </TabsTrigger>
      </TabsList>

      {/* TabsContent is needed for the Tabs component to work properly */}
      <TabsContent value="all" className="mt-0"></TabsContent>
      <TabsContent value="wishlist" className="mt-0"></TabsContent>
      <TabsContent value="purchased" className="mt-0"></TabsContent>
      <TabsContent value="stash" className="mt-0"></TabsContent>
      <TabsContent value="progress" className="mt-0"></TabsContent>
      <TabsContent value="completed" className="mt-0"></TabsContent>
      <TabsContent value="destashed" className="mt-0"></TabsContent>
      <TabsContent value="archived" className="mt-0"></TabsContent>
    </Tabs>
  );
};

export default StatusTabsComponent;
