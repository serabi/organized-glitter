import MainLayout from '@/components/layout/MainLayout';
import { Skeleton } from '@/components/ui/skeleton'; // Import the Skeleton component

const SkeletonCard = () => (
  <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-white shadow-md dark:bg-gray-800">
    <Skeleton className="relative h-48 w-full bg-gray-200 dark:bg-gray-700 sm:h-56 md:h-64" />
    <div className="flex flex-1 flex-col p-4">
      <Skeleton className="mb-2 h-5 w-3/4" /> {/* Title */}
      <div className="mt-2 flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" /> {/* Company */}
        <Skeleton className="h-4 w-2/3" /> {/* Size */}
        <Skeleton className="h-4 w-1/2" /> {/* Drill Shape */}
      </div>
      <Skeleton className="mt-4 h-9 w-full" /> {/* Button */}
    </div>
  </div>
);

const DashboardLoadingState = () => {
  return (
    <MainLayout>
      <div className="p-4 md:p-6">
        {' '}
        {/* Added padding consistent with Dashboard page */}
        {/* Optional: Skeleton for filters if they also load with main content */}
        {/* <div className="mb-6 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-1/3" />
        </div> */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default DashboardLoadingState;
