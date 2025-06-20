import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectFilterStatus } from '@/types/project';
import { useDashboardFiltersContext } from '@/hooks/useDashboardFiltersContext';

const StatusTabsComponent = () => {
  // Removed unused props
  const { getCountsForTabs, activeStatus, applyStatusFilter } = useDashboardFiltersContext();
  const counts = getCountsForTabs();

  return (
    <Tabs
      value={activeStatus}
      defaultValue={activeStatus}
      className="w-full"
      onValueChange={value => applyStatusFilter(value as ProjectFilterStatus)} // Use context action
    >
      <TabsList className="grid h-auto grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-8">
        <TabsTrigger value="all" className="flex items-center gap-2">
          <span>All</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {counts.all}
          </span>
        </TabsTrigger>
        <TabsTrigger value="wishlist" className="flex items-center gap-2">
          <span>Wishlist</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {counts.wishlist}
          </span>
        </TabsTrigger>
        <TabsTrigger value="purchased" className="flex items-center gap-2">
          <span>Purchased</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {counts.purchased}
          </span>
        </TabsTrigger>
        <TabsTrigger value="stash" className="flex items-center gap-2">
          <span>In Stash</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {counts.stash}
          </span>
        </TabsTrigger>
        <TabsTrigger value="progress" className="flex items-center gap-2">
          <span>In Progress</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {counts.progress}
          </span>
        </TabsTrigger>
        <TabsTrigger value="completed" className="flex items-center gap-2">
          <span>Completed</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {counts.completed}
          </span>
        </TabsTrigger>
        <TabsTrigger value="destashed" className="flex items-center gap-2">
          <span>Destashed</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {counts.destashed}
          </span>
        </TabsTrigger>
        <TabsTrigger value="archived" className="flex items-center gap-2">
          <span>Archived</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {counts.archived}
          </span>
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

export default React.memo(StatusTabsComponent);
