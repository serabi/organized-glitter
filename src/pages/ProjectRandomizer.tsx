/**
 * @fileoverview Project Randomizer Page Component
 *
 * Main page component for the project randomizer feature. Provides a complete
 * interface for selecting projects, spinning the wheel, viewing results, and
 * managing spin history. Features responsive design, accessibility support,
 * and comprehensive error handling.
 *
 * @author Generated with Claude Code
 * @version 1.0.0
 * @since 2025-06-28
 */

import React from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { RandomizerWheel } from '@/components/randomizer/RandomizerWheel';
import { ProjectSelector } from '@/components/randomizer/ProjectSelector';
import { SpinHistory } from '@/components/randomizer/SpinHistory';
import { useRandomizer } from '@/hooks/useRandomizer';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Shuffle, ExternalLink, Lightbulb, Home, Share2 } from 'lucide-react';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('ProjectRandomizer');

/**
 * Project Randomizer page component
 *
 * Main page for the randomizer feature that allows users to select from their
 * in-progress projects and spin a wheel to randomly choose which project to work on.
 * Includes project selection, spinning wheel, results display, and history tracking.
 *
 * @returns {JSX.Element} The complete randomizer page with all functionality
 *
 * @features
 * - Interactive spinning wheel with brand colors and animations
 * - Project selection interface with batch operations
 * - Spin result display with navigation to selected project
 * - Comprehensive statistics dashboard
 * - Spin history with pagination and timestamps
 * - Responsive design for all device sizes
 * - Accessibility support (WCAG 2.1 AA)
 * - Error handling and loading states
 * - Empty state guidance for new users
 *
 * @layout
 * 1. **Hero Section**: Large randomizer wheel at the top
 * 2. **Statistics**: 4-card grid showing key metrics
 * 3. **Two-Column Layout**:
 *    - Left: Project selection interface
 *    - Right: Spin history and management
 *
 * @userflow
 * 1. User sees their in-progress projects in the selection area
 * 2. User selects 2+ projects they want to include in randomization
 * 3. User clicks "Spin the Wheel!" to randomly select a project
 * 4. Result is displayed with link to go work on that project
 * 5. Spin is automatically saved to history for future reference
 *
 * @accessibility
 * - Keyboard navigation throughout
 * - Screen reader announcements for spin results
 * - Semantic HTML structure with proper headings
 * - Focus management and visual indicators
 * - Alternative content for complex interactions
 */
const ProjectRandomizer: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  /** Main randomizer hook providing all state and actions */
  const {
    availableProjects,
    selectedProjects,
    selectedProjectIds,
    lastSpinResult,
    stats,
    isLoadingProjects,
    isCreatingSpin,
    error,
    toggleProject,
    selectAllProjects,
    selectNoProjects,
    handleSpinComplete,
    clearLastResult,
    getShareableUrl,
  } = useRandomizer();

  React.useEffect(() => {
    logger.debug('ProjectRandomizer mounted', {
      availableProjectsCount: availableProjects.length,
      selectedProjectsCount: selectedProjectIds.size,
    });
  }, [availableProjects.length, selectedProjectIds.size]);

  const handleShare = React.useCallback(async () => {
    try {
      const shareUrl = getShareableUrl();

      if (navigator.share && stats.selectedCount > 0) {
        // Use native sharing if available and there are selected projects
        await navigator.share({
          title: 'Project Randomizer Configuration',
          text: `Check out my randomizer setup with ${stats.selectedCount} selected projects!`,
          url: shareUrl,
        });
        logger.debug('Native share completed');
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: 'URL Copied!',
          description:
            stats.selectedCount > 0
              ? `Shareable URL with ${stats.selectedCount} selected projects copied to clipboard.`
              : 'Randomizer URL copied to clipboard.',
        });
        logger.debug('URL copied to clipboard', { selectedCount: stats.selectedCount });
      }
    } catch (error) {
      logger.error('Share failed', { error });
      toast({
        title: 'Share Failed',
        description: 'Unable to share or copy URL. Please try again.',
        variant: 'destructive',
      });
    }
  }, [getShareableUrl, stats.selectedCount, toast]);

  if (error) {
    return (
      <MainLayout>
        {/* Breadcrumb Navigation */}
        <div className="container mx-auto max-w-7xl px-3 pb-4 pt-4 sm:px-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/" className="flex items-center gap-1">
                    <Home className="h-4 w-4" />
                    Dashboard
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="flex items-center gap-1">
                  <Shuffle className="h-4 w-4" />
                  Project Randomizer
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load randomizer data. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Breadcrumb Navigation */}
      <div className="container mx-auto max-w-7xl px-3 pb-4 pt-4 sm:px-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/" className="flex items-center gap-1">
                  <Home className="h-4 w-4" />
                  Dashboard
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="flex items-center gap-1">
                <Shuffle className="h-4 w-4" />
                Project Randomizer
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="container mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6 md:py-8">
        {/* Page Header - Enhanced Mobile Layout */}
        <div className="mb-6 md:mb-8">
          <div className="mb-3 flex items-center justify-between md:mb-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <Shuffle className="h-6 w-6 text-primary sm:h-8 sm:w-8" />
              <h1 className="text-2xl font-bold sm:text-3xl">Project Randomizer</h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="flex items-center gap-2"
              title={
                stats.selectedCount > 0
                  ? `Share configuration with ${stats.selectedCount} selected projects`
                  : 'Share randomizer URL'
              }
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Share</span>
            </Button>
          </div>
          <p className="text-base text-muted-foreground sm:text-lg">
            Can't decide which project to work on? Let the wheel choose for you!
            {stats.selectedCount > 0 && (
              <span className="ml-2 font-medium text-primary">
                ({stats.selectedCount} projects selected)
              </span>
            )}
          </p>
        </div>

        {/* Hero Section - Randomizer Wheel - Enhanced Mobile Layout */}
        <Card className="mb-6 md:mb-8">
          <CardHeader className="text-center">
            <CardDescription className="text-sm sm:text-base md:text-lg">
              Select your in-progress projects below, then come back to spin the wheel!
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center py-4 sm:py-6 md:py-8">
            <RandomizerWheel
              projects={selectedProjects}
              onSpinComplete={handleSpinComplete}
              disabled={!stats.canSpin || isCreatingSpin}
            />

            {/* Spin Result - Enhanced Mobile Layout */}
            {lastSpinResult && (
              <div className="mt-4 w-full max-w-md sm:mt-6 md:mt-8">
                <Card className="border-primary bg-primary/5">
                  <CardHeader className="pb-2 sm:pb-3">
                    <CardTitle className="text-center text-lg sm:text-xl">
                      Selected Project
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-center sm:space-y-4">
                    <h3 className="text-xl font-bold sm:text-2xl">{lastSpinResult.title}</h3>
                    {(lastSpinResult.company || lastSpinResult.artist) && (
                      <p className="text-base text-muted-foreground sm:text-lg">
                        {[lastSpinResult.company, lastSpinResult.artist]
                          .filter(Boolean)
                          .join(' • ')}
                      </p>
                    )}
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-center sm:gap-3">
                      <Button asChild>
                        <Link
                          to={`/projects/${lastSpinResult.id}`}
                          state={{
                            from: 'randomizer',
                            randomizerState: {
                              selectedProjects: Array.from(selectedProjectIds),
                              shareUrl: getShareableUrl(),
                            },
                          }}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View Project
                        </Link>
                      </Button>
                      <Button variant="outline" onClick={clearLastResult}>
                        Clear Result
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Helper Messages - Enhanced Mobile Layout */}
            {!stats.hasProjects && !isLoadingProjects && (
              <Alert className="mt-4 max-w-lg sm:mt-6 md:mt-8">
                <Lightbulb className="h-4 w-4" />
                <AlertDescription className="text-sm sm:text-base">
                  You don't have any projects in progress.
                  <Link to="/dashboard" className="ml-1 font-medium text-primary hover:underline">
                    Start some projects
                  </Link>{' '}
                  to use the randomizer!
                </AlertDescription>
              </Alert>
            )}

            {stats.hasSelection && !stats.canSpin && (
              <Alert className="mt-4 max-w-lg sm:mt-6 md:mt-8">
                <Lightbulb className="h-4 w-4" />
                <AlertDescription className="text-sm sm:text-base">
                  Select at least 2 projects to make the randomizer interesting!
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Stats Summary - Enhanced Mobile-First Design */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 md:mb-8 md:grid-cols-4">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="text-xl font-bold sm:text-2xl">{stats.totalProjects}</div>
              <p className="text-xs text-muted-foreground sm:text-sm">In Progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="text-xl font-bold sm:text-2xl">{stats.selectedCount}</div>
              <p className="text-xs text-muted-foreground sm:text-sm">Selected</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="text-xl font-bold sm:text-2xl">{stats.recentSpins}</div>
              <p className="text-xs text-muted-foreground sm:text-sm">Total Spins</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="text-xl font-bold text-primary sm:text-2xl">
                {stats.canSpin ? '✓' : '○'}
              </div>
              <p className="text-xs text-muted-foreground sm:text-sm">Ready to Spin</p>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section - Project Selection and History - Enhanced Mobile Layout */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:gap-8 lg:grid-cols-2">
          {/* Left Panel - Project Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Choose Your Projects</CardTitle>
              <CardDescription>
                Select which in-progress projects to include in the randomizer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProjectSelector
                projects={availableProjects}
                selectedProjects={selectedProjectIds}
                onProjectToggle={toggleProject}
                onSelectAll={selectAllProjects}
                onSelectNone={selectNoProjects}
                isLoading={isLoadingProjects}
              />
            </CardContent>
          </Card>

          {/* Right Panel - Spin History */}
          <Card>
            <CardHeader>
              <CardTitle>Spin History</CardTitle>
              <CardDescription>Your recent randomizer results</CardDescription>
            </CardHeader>
            <CardContent>
              <SpinHistory userId={user?.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default ProjectRandomizer;
