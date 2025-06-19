import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { ProjectType } from '@/types/project';
import ProjectCardLite from '@/components/dashboard/ProjectCardLite';
import { queryKeys } from '@/hooks/queries/queryKeys';

interface InProgressSectionProps {
  inProgressProjects: ProjectType[];
  isLoading: boolean;
}

/**

    <Skeleton className="h-48 sm:h-56 md:h-64 w-full" />
    <CardContent className="p-4 space-y-3">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-8 w-full mt-4" />
    </CardContent>
  </Card>
);

/**
 * Created 2025-05-26 while refactoring Overview.tsx
 * Enhanced with proper skeleton loading and optimized rendering
 */
const InProgressSectionComponent = ({ inProgressProjects, isLoading }: InProgressSectionProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // OG-91: Memoized navigation callback to prevent ProjectCard re-renders
  const handleProjectClick = useCallback(
    (projectId: string) => {
      navigate(`/projects/${projectId}`);
    },
    [navigate]
  );

  // Phase 5: Strategic prefetching for better perceived performance
  const handleDashboardHover = useCallback(() => {
    // Prefetch dashboard projects query to improve perceived performance
    queryClient.prefetchQuery({
      queryKey: queryKeys.projects.lists(),
      staleTime: 30 * 1000, // Only prefetch if data is older than 30 seconds
    });
  }, [queryClient]);

  const handleNewProjectHover = useCallback(() => {
    // Prefetch companies and artists for the new project form
    queryClient.prefetchQuery({
      queryKey: queryKeys.companies.lists(),
      staleTime: 60 * 1000, // Companies don't change often
    });
    queryClient.prefetchQuery({
      queryKey: queryKeys.artists.lists(),
      staleTime: 60 * 1000, // Artists don't change often
    });
  }, [queryClient]);

  return (
    <section className="mb-12">
      <div className="mb-6 flex items-center">
        <h2 className="flex items-center text-2xl font-semibold">
          <Calendar className="mr-2 h-6 w-6 text-primary" />
          <span className="bg-gradient-to-r from-primary to-flamingo-400 bg-clip-text text-transparent">
            Projects In Progress
          </span>
        </h2>
      </div>

      {isLoading ? null : inProgressProjects.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {inProgressProjects.slice(0, 6).map((project: ProjectType) => (
              <ProjectCardLite key={project.id} project={project} onClick={handleProjectClick} />
            ))}
          </div>
          {inProgressProjects.length > 6 && (
            <div className="mt-6 text-center">
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard?status=in-progress')}
                onMouseEnter={handleDashboardHover}
                onFocus={handleDashboardHover}
              >
                View All {inProgressProjects.length} In Progress Projects
              </Button>
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="mb-4 text-muted-foreground">
              You don't have any projects in progress currently.
            </p>
            <Button
              onClick={() => navigate('/projects/new')}
              onMouseEnter={handleNewProjectHover}
              onFocus={handleNewProjectHover}
            >
              Start a New Project
            </Button>
          </CardContent>
        </Card>
      )}
    </section>
  );
};

// OG-91: Memoize the entire component to prevent unnecessary re-renders
export const InProgressSection = memo(InProgressSectionComponent);
