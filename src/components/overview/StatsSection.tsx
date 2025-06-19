import { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, Sparkles, CheckCircle, Diamond } from 'lucide-react';

interface StatsData {
  completedCount: number;
  estimatedDrills: number;
  startedCount: number;
  inProgressCount: number;
  totalDiamonds: number;
}

type StatsSectionProps =
  | { isLoading: true; stats?: StatsData }
  | { isLoading?: false; stats: StatsData };

/**
 * Created 2025-05-26 while refactoring Overview.tsx
 * Statistics cards section displaying yearly project stats
 * Memoized for performance optimization
 */
function StatsSectionComponent({ stats, isLoading = false }: StatsSectionProps) {
  const currentYear = new Date().getFullYear();

  // Skeleton loading state
  if (isLoading) {
    return (
      <section className="mb-12 rounded-xl border border-border/30 bg-gradient-to-br from-background to-muted p-6 shadow-md">
        <div className="mb-6 flex items-center">
          <LineChart className="mr-2 h-6 w-6 text-primary" />
          <Skeleton className="h-8 w-48" />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Skeleton cards */}
          {[1, 2, 3].map(index => (
            <Card
              key={index}
              className="border-0 bg-white/50 shadow-sm backdrop-blur-sm dark:bg-black/20"
            >
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Skeleton className="mr-2 h-5 w-5 rounded-sm" />
                  <Skeleton className="h-5 w-32" />
                </CardTitle>
                <CardDescription>
                  <span className="inline-block h-4 w-40 animate-pulse rounded bg-muted"></span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-9 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  // Type guard to ensure stats is defined (TypeScript refinement)
  if (!stats) {
    return null; // or throw an error, depending on your preference
  }

  return (
    <section className="mb-12 rounded-xl border border-border/30 bg-gradient-to-br from-background to-muted p-6 shadow-md">
      <h2 className="mb-6 flex items-center text-2xl font-semibold">
        <LineChart className="mr-2 h-6 w-6 text-primary" />
        <span className="bg-gradient-to-r from-primary to-flamingo-400 bg-clip-text text-transparent">
          Your {currentYear} Stats
        </span>
      </h2>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="border-0 bg-white/50 shadow-sm backdrop-blur-sm dark:bg-black/20">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Sparkles className="mr-2 h-5 w-5 text-amber-500" />
              Started this Year
            </CardTitle>
            <CardDescription>New projects begun this year</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.startedCount}</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white/50 shadow-sm backdrop-blur-sm dark:bg-black/20">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="mr-2 h-5 w-5 text-emerald-500" />
              Completed Projects
            </CardTitle>
            <CardDescription>Projects finished this year</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.completedCount}</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white/50 shadow-sm backdrop-blur-sm dark:bg-black/20">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Diamond className="mr-2 h-5 w-5 text-violet-500" />
              Drills Placed
            </CardTitle>
            <CardDescription>Total this year from finished paintings</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.estimatedDrills.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

// Memoized export for performance optimization
export const StatsSection = memo(StatsSectionComponent);
